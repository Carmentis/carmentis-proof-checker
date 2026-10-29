import { CryptoEncoderFactory } from '@cmts-dev/carmentis-sdk-core'

/**
 * Local verification of an SD-JWT credential or presentation.
 *
 * Deliberately not built on the SDK's `SdJwt.decode().valid`: that flag mixes the signature check with a
 * network revocation check, so a malformed status list made valid credentials look forged. The
 * revocation status is not checked here and is reported as such.
 */

export interface SdJwtCheck {
    /** Issuer signature, and holder key binding when the token is a presentation. */
    valid: boolean
    problem?: 'issuer-signature' | 'key-binding' | 'malformed'
    issuer?: string
    subject?: string
    claims: Record<string, unknown>
    issuerJwk?: JsonWebKey & { x5c?: string[] }
    validFrom?: Date | null
    validUntil?: Date | null
    keyBinding: 'valid' | 'absent' | 'invalid'
    /** True when the credential points to a revocation status list that was not consulted. */
    hasStatus: boolean
}

type Json = Record<string, unknown>

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
    const binary = atob(base64)
    const bytes = new Uint8Array(new ArrayBuffer(binary.length))
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
}

function encodeBase64Url(bytes: Uint8Array) {
    let binary = ''
    bytes.forEach((b) => (binary += String.fromCharCode(b)))
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decodeJson(value: string): Json {
    return JSON.parse(new TextDecoder().decode(decodeBase64Url(value)))
}

/** `did:jwk:<base64url JWK>` is the only DID method the credentials use as key holder / issuer. */
function jwkFromDid(did: string): (JsonWebKey & { x5c?: string[] }) | undefined {
    const [scheme, method, encoded] = did.split(':')
    if (scheme !== 'did' || method !== 'jwk' || !encoded) return undefined
    return decodeJson(encoded) as JsonWebKey & { x5c?: string[] }
}

const ALGORITHMS: Record<string, { import: AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams; verify: AlgorithmIdentifier | EcdsaParams }> = {
    EdDSA: { import: { name: 'Ed25519' }, verify: { name: 'Ed25519' } },
    ES256: { import: { name: 'ECDSA', namedCurve: 'P-256' }, verify: { name: 'ECDSA', hash: 'SHA-256' } },
    RS256: { import: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, verify: { name: 'RSASSA-PKCS1-v1_5' } },
}

async function verifyJws(token: string, jwk: JsonWebKey & { x5c?: string[] }): Promise<boolean> {
    try {
        const [header, payload, signature] = token.split('.')
        if (!header || !payload || !signature) return false
        const algorithm = ALGORITHMS[String(decodeJson(header).alg)]
        if (!algorithm) return false
        const { x5c: _x5c, ...publicJwk } = jwk
        const key = await crypto.subtle.importKey('jwk', publicJwk, algorithm.import, false, ['verify'])
        return await crypto.subtle.verify(
            algorithm.verify,
            key,
            decodeBase64Url(signature),
            new TextEncoder().encode(`${header}.${payload}`),
        )
    } catch {
        return false
    }
}

/**
 * Verify a JWS signed with a key the platform cannot import (secp256k1, ML-DSA...): Carmentis keys are
 * decoded by the SDK, which is what the Operator does for holder keys.
 */
async function verifyJwsWithSdkKey(token: string, encodedKey: string): Promise<boolean> {
    try {
        const [header, payload, signature] = token.split('.')
        if (!header || !payload || !signature) return false
        const key = await CryptoEncoderFactory.defaultStringSignatureEncoder().decodePublicKey(encodedKey)
        return await key.verify(new TextEncoder().encode(`${header}.${payload}`), decodeBase64Url(signature))
    } catch {
        return false
    }
}

/** Verify a token against a key given as a DID or an SDK-encoded key, whichever algorithm it uses. */
async function verifyWithKey(token: string, encodedKey: string): Promise<boolean> {
    const jwk = jwkFromDid(encodedKey)
    const alg = String(decodeJson(token.split('.')[0]!).alg)
    if (jwk && ALGORITHMS[alg] && (await verifyJws(token, jwk))) return true
    return verifyJwsWithSdkKey(token, encodedKey)
}

function toDate(value: unknown) {
    return typeof value === 'number' ? new Date(value * 1000) : null
}

export async function checkSdJwt(sdJwt: string): Promise<SdJwtCheck> {
    const empty: SdJwtCheck = { valid: false, problem: 'malformed', claims: {}, keyBinding: 'absent', hasStatus: false }
    try {
        const parts = sdJwt.split('~')
        const issuerJwt = parts[0]!
        const keyBindingJwt = parts[parts.length - 1]!
        const disclosures = parts.slice(1, -1)
        const payload = decodeJson(issuerJwt.split('.')[1]!)

        // Object-property disclosures are [salt, name, value]; array-element ones are ignored.
        const claims: Json = { ...payload }
        for (const disclosure of disclosures) {
            const entry = JSON.parse(new TextDecoder().decode(decodeBase64Url(disclosure)))
            if (Array.isArray(entry) && entry.length === 3) claims[String(entry[1])] = entry[2]
        }

        const issuer = typeof payload.iss === 'string' ? payload.iss : undefined
        const subject = typeof payload.sub === 'string' ? payload.sub : undefined
        const issuerJwk = issuer ? jwkFromDid(issuer) : undefined
        const issuerValid = issuerJwk ? await verifyJws(issuerJwt, issuerJwk) : false

        let keyBinding: SdJwtCheck['keyBinding'] = 'absent'
        if (keyBindingJwt.length > 0) {
            const signedPart = sdJwt.slice(0, sdJwt.length - keyBindingJwt.length)
            const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(signedPart)))
            const sdHash = decodeJson(keyBindingJwt.split('.')[1]!).sd_hash
            keyBinding =
                subject && sdHash === encodeBase64Url(digest) && (await verifyWithKey(keyBindingJwt, subject))
                    ? 'valid'
                    : 'invalid'
        }

        const problem = !issuerValid ? 'issuer-signature' : keyBinding === 'invalid' ? 'key-binding' : undefined
        return {
            valid: problem === undefined,
            problem,
            issuer,
            subject,
            claims,
            issuerJwk,
            validFrom: toDate(payload.nbf),
            validUntil: toDate(payload.exp),
            keyBinding,
            hasStatus: payload.status !== undefined,
        }
    } catch {
        return empty
    }
}

import { SDJwtVcInstance } from '@sd-jwt/sd-jwt-vc';
import { digest } from '@sd-jwt/crypto-browser';
import { importJWK } from "jose";
import { Base64 } from "@cmts-dev/carmentis-sdk-core";
const subtle = window.crypto.subtle;

export class SdJwt {
    private jwt: string;

    constructor(jwt: string) {
        this.jwt = jwt;
    }

    async decode() {
        const sdJwt = new SDJwtVcInstance({
            hasher: digest,
        });
        const claims = await sdJwt.getClaims(this.jwt) as { [key: string]: string };
        let issuer = "-";
        let issuedOn: string | Date = "-";
        let validFrom: string | Date = "-";
        let validUntil: string | Date = "-";
        let issuerJwk = null;
        let valid = false;

        if (claims.iss !== undefined) {
            issuer = claims.iss;
            valid = await this.verify(issuer);
            issuerJwk = this.extractJwk(issuer);
        }
        if (claims.iat !== undefined) {
            issuedOn = new Date(Number(claims.iat) * 1000);
        }
        if (claims.nbf !== undefined) {
            validFrom = new Date(Number(claims.nbf) * 1000);
        }
        if (claims.exp !== undefined) {
            validUntil = new Date(Number(claims.exp) * 1000);
        }
        return {
            info: {
                issuedOn, validFrom, validUntil,
            },
            claims,
            issuerJwk,
            valid,
        };
    }

    extractJwk(issuer: string) {
        const parts = issuer.split(":");
        const issuerJwt = parts[2];
        if (issuerJwt === undefined) {
            throw new Error("Invalid DID format");
        }
        const jwk = JSON.parse(
            Base64.decodeString(issuerJwt, Base64.URL)
        );
        return jwk;
    }

    async verify(issuer: string) {
        const jwk = this.extractJwk(issuer);
        const crv = jwk.crv;
        const key = (await importJWK(jwk, crv, {
            extractable: true,
        })) as CryptoKey;

        const sdjwtVerifier = new SDJwtVcInstance({
            hasher: digest,
            verifier: async (data, signature) => {
                const binData = (new TextEncoder()).encode(data);
                const binSig = Base64.decodeBinary(signature, Base64.URL);
                const verified = await subtle.verify(
                    { name: crv },
                    key,
                    binSig,
                    binData,
                );
                return verified;
            }
        });
        let verified = true;
        try {
            await sdjwtVerifier.verify(this.jwt)
        }
        catch (error) {
            console.error("sig verification failed", error);
            verified = false;
        }
        return verified;
    }

    static timestampToDate(ts: number) {
        return new Date(ts * 1000).toISOString().slice(0, -5);
    }
}

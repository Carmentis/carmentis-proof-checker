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
        let issuedOn = "-";
        let validFrom = "-";
        let validUntil = "-";

        if (claims.iss !== undefined) {
            issuer = claims.iss;
            await this.verify(issuer);
        }
        if (claims.iat !== undefined) {
            issuedOn = SdJwt.timestampToDate(Number(claims.iat));
        }
        if (claims.nbf !== undefined) {
            validFrom = SdJwt.timestampToDate(Number(claims.nbf));
        }
        if (claims.exp !== undefined) {
            validUntil = SdJwt.timestampToDate(Number(claims.exp));
        }
        return {
            info: {
                issuer, issuedOn, validFrom, validUntil,
            },
            claims,
        };
    }

    async verify(issuer: string) {
        const issuerJwt = issuer.split(":")[2];
        if (issuerJwt === undefined) {
            throw new Error("Invalid DID format");
        }
        console.log("issuerJwt", issuerJwt);
        const jwk = JSON.parse(
            Base64.decodeString(issuerJwt, Base64.URL)
        );
        console.log("jwk", jwk);
        const key = (await importJWK(jwk, 'Ed25519', {
            extractable: true,
        })) as CryptoKey;
        console.log("key", key);

        const sdjwtVerifier = new SDJwtVcInstance({
            hasher: digest,
            verifier: async (data, signature) => {
                console.log(`data:${data} signature:${signature}`);
                const binData = Base64.decodeBinary(data, Base64.URL);
                console.log("data", binData);
                const binSig = Base64.decodeBinary(signature, Base64.URL);
                console.log("sig", binSig);
                const verified = await subtle.verify(
                    { name: "Ed25519" },
                    key,
                    binSig,
                    binData,
                );
                console.log("verified", verified);
                return verified;
            }
        });
        let verified = true;
        try {
            await sdjwtVerifier.verify(this.jwt)
        }
        catch (error) {
            verified = false;
        }
        return verified;
    }

    static timestampToDate(ts: number) {
        return new Date(ts * 1000).toISOString().slice(0, -5);
    }
}

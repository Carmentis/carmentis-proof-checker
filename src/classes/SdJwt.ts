import { SDJwtVcInstance } from '@sd-jwt/sd-jwt-vc';
import { digest } from '@sd-jwt/crypto-browser';

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

    static timestampToDate(ts: number) {
        return new Date(ts * 1000).toISOString().slice(0, -5);
    }
}

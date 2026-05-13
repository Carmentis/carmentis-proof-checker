import { SDJwtVcInstance } from "@sd-jwt/sd-jwt-vc";
import { digest } from "@sd-jwt/crypto-nodejs";
import { importJWK } from "jose";
import { subtle } from "node:crypto";

testJwt();

async function testJwt() {
    const sdjwt = new SDJwtVcInstance({
        hasher: digest
    });

    const jwt =
        "eyJ0eXAiOiJzZCtqd3QiLCJhbGciOiJFZERTQSJ9.eyJpc3MiOiJkaWQ6andrOmV5SmpjbllpT2lKRlpESTFOVEU1SWl3aWVDSTZJbVpoVTNoamEyRlljRXhWWkRBNGMzcEdlblZSVFZSR2RVRTJRVmR3WlV4c05rUXdTV1ZYVmxFMWRtc2lMQ0pyZEhraU9pSlBTMUFpZlEiLCJpYXQiOjE3Nzg2NTY2NTAsInZjdCI6IkVtYWlsQ3JlZGVudGlhbCIsInN1YiI6ImRpZDpqd2s6ZXlKcmRIa2lPaUpQUzFBaUxDSmpjbllpT2lKRlpESTFOVEU1SWl3aVlXeG5Jam9pUldSRVUwRWlMQ0o0SWpvaVpIWjZZelIzTUdWcVlUbDFaMGg1ZDE4MVpWQldjblZETkZNeFVGcEpOVVo0VlhoeGEwcHZhM0J4YnlKOSIsIl9zZCI6WyJCVHNxdFhDYU03RGlycENIYi1kaHg4cjVoc0lORHB6cmIzM0ZMZ2xFZVY0Il0sIl9zZF9hbGciOiJzaGEtMjU2In0.QhC963VLZe1ZNsUB5b0ltTJZHwFlGr1lcev_2jrK0s0k8wXQ2igY5qeTMq2YbkNV0Puj_IZq4oKBFDy3MEIHAA~WyJNRHBzOTFNN2RKVVdIODR0dmIxZTl3IiwiZW1haWwiLCJnYWVsLm1hcmNhZGV0QGNhcm1lbnRpcy5pbyJd~";
        //"eyJ0eXAiOiJkYytzZC1qd3QiLCJhbGciOiJFUzI1NiJ9.eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvbnMvY3JlZGVudGlhbHMvdjIiXSwidHlwZSI6WyJWZXJpZmlhYmxlQ3JlZGVudGlhbCJdLCJ2YWxpZEZyb20iOiIxOTcwLTAxLTIxVDEzOjEyOjQ4LjQzOFoiLCJ2YWxpZFVudGlsIjoiMTk3MC0wMS0yMVQyMTo1ODoyNC40MzhaIiwidmN0IjoiaHR0cDovL2xvY2FsaG9zdDozMDAwL2NyZWRlbnRpYWxzL2lkZW50aXR5IiwiY3JlZGVudGlhbFN1YmplY3QiOnsiX3NkIjpbIjFmc05sUnNBbEJoQi14Rkg3aEJuQ3JHWTF0cllWSXNRazFOb21BbU5aQlUiLCJCUEFWVm1idTlFSGZ4Z2pFbWNJRy1nSXBpbGFOTmNzSUZmclkzLXFOcEUwIiwiQ1Q3bk5Fc0VLYXhqMUEySUhNTU1zYU8zdDBtY1RubTE4ZGxvNE9MQ21tRSIsIk1RODZYbWdIUXZrcnlQeC1sMzZJam84N1hmUzd4U0hlMUh0T1lkVERzVkEiLCJoekFlY2NPMGZEblkzN0xaVWd2ZXhZNHFmcGhsV29iTDJOU3VZdllCN29NIiwibzdTd0ZpZGM2TTNOVlFaYUtaNjlaTjZzWjB4djZxV01sWXNZbENqSGd4NCIsInJIM1NNZjFKdU42Vl9nUnJYVTYweGU3RU5aT09xXzRISV9iWWlGNlRLSTgiLCJ0OE5XdzZvVkQxZjI2SU5IOWlxcGxydGR1cjRRZ0t2OC04c21pZ0VSQjJzIiwidXhFTnBhbDZOaEF2NS0zTUFoZHB4OGZ5NVBldGxWY0lhSWVTcWFBeTZwMCJdfSwiX3NkIjpbIlF5YnNZY0dtOTBBRUFSTnpSZFhfX0lUQTAydlNOZWtSOFFHS210ZVRPWmciLCJoVlZRZVVlWVpaUW1OdzhvNGtKRWNvajVVdk9HOVl0ZjVETmIxTkdiOFRJIl0sIl9zZF9hbGciOiJzaGEtMjU2In0.Dh-YfX9sLxQayLblsaEsOHCioxQvlVnLqfuzcq-QideOCcHtDtrukwEsXjeaHuOcDHHWVERYtTK7rY4DV5Xl3A~WyJiNTI4MWE4OTk5OThiOGRhIiwiaWQiLCJkaWQ6ZXhhbXBsZTplYmZlYjFmNzEyZWJjNmYxYzI3NmUxMmVjMjEiXQ~WyIyM2I5Yzk1ZTlkZjcyMmMwIiwiZmlyc3RuYW1lIiwiSm9obiJd~WyI1Njc5NTY1MzBkNDcwM2Q4IiwibGFzdG5hbWUiLCJEb2UiXQ~WyI3YzM1ODlhZGJiN2EzYjkzIiwiZW1haWwiLCJqb2huLmRvZUBnbWFpbC5jb20iXQ~WyIxNmE5ZGEwNjVlYzczYjZjIiwiZmlfdmNfcmVjaXBpZW50IiwiIl0~WyI5MjQ2NTM3YjliYTFkOWMxIiwiZmlfdmNfcmVhc29uIiwiIl0~WyJhNTUxODBmNDU0ZjJjOTkxIiwiZmlfdmNfc2hhMjU2IiwiIl0~WyIzMWIxMzQ1ZjgzNDIzYjJlIiwiYWdlX292ZXJfMTgiLHRydWVd~WyJhZTY5MzVlYmM4ZWQyZGI3IiwiYWdlX292ZXJfMjEiLHRydWVd~WyI4OGY3NzkxZDA3ZGIzZWNjIiwiaWQiLCIxMjMiXQ~WyI1MDc4MzUwMjVmY2E2MDRkIiwiaXNzdWVyIiwiZGlkOndlYjpsb2NhbGhvc3Q6MzAwMCJd~";

    const claims = await sdjwt.getClaims(jwt);
    console.log("getClaims", claims);
    if (
        typeof claims !== "object" ||
        claims === null ||
        !("iss" in claims) ||
        typeof claims.iss !== "string"
    ) {
        throw new Error("iss field is missing or malformed");
    }

    const issuerJwt = claims.iss.split(":")[2];
    console.log("issuerJwt", issuerJwt);
    const jwk = JSON.parse(
        Buffer.from(issuerJwt, "base64url").toString("utf8")
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
            const binData = Buffer.from(data);
            console.log("data", binData);
            const binSig = Buffer.from(signature, "base64url");
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
    console.log("sdjwtVerifier.verify", await sdjwtVerifier.verify(jwt));

    // const verifier = await ES256.getVerifier(jwk);
    // console.log("verifier", verifier);
    // console.log("verify", await sdjwt.verify(jwt));
}

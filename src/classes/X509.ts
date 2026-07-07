import { X509Certificate } from "@peculiar/x509";

const DN_OIDS: Record<string, [ string, string ]> = {
    "2.5.4.3": [ "CN", "Common Name" ],
    "2.5.4.6": [ "C", "Country Name" ],
    "2.5.4.7": [ "L", "Locality Name" ],
    "2.5.4.8": [ "S", "State or Province Name"],
    "2.5.4.9": [ "Street", "Street Address" ],
};

export class X509 {
    static decodeX5c(x5c: string[]) {
        const certificates = x5c.map((x509) => {
            const cert = new X509Certificate(x509);
            return cert;
        });
        return certificates;
    }
}

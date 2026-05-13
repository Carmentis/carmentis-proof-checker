import { decodeJwt, jwtVerify } from 'jose';
import * as pkijs from 'pkijs';
import * as asn1js from 'asn1js';

const OID = {
    CN: "2.5.4.3",
    O: "2.5.4.10",
    OU: "2.5.4.11",
    C: "2.5.4.6",
    L: "2.5.4.7",
    ST: "2.5.4.8",
    emailAddress: "1.2.840.113549.1.9.1",
} as const;

test();

async function test() {
  const root = await createRootCert();
  const rootBase64 = root.cert.toString("base64");
  const leaf = await createLeafCert(root.cert, root.keys);
  const leafBase64 = leaf.cert.toString("base64");

  console.log("Root");
  console.log("Subject:", root.cert.subject.typesAndValues);
  console.log("Issuer:", root.cert.issuer.typesAndValues);
  console.log("Valid from:", root.cert.notBefore.value);
  console.log("Valid to:", root.cert.notAfter.value);
  console.log(rootBase64);

  console.log("Leaf");
  console.log("Subject:", leaf.cert.subject.typesAndValues);
  console.log("Issuer:", leaf.cert.issuer.typesAndValues);
  console.log("Valid from:", leaf.cert.notBefore.value);
  console.log("Valid to:", leaf.cert.notAfter.value);
  console.log(leafBase64);

  const rebuiltRootDer = Buffer.from(rootBase64, "base64").buffer;
  const rebuiltRootCert = derToCert(rebuiltRootDer);
  const issuer = rebuiltRootCert.issuer;
  console.log(getOid(issuer, OID.CN));
  console.log(getOid(issuer, OID.O));

  /*
  const jwt = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJ2YyI6eyJAY29udGV4dCI6WyJodHRwczovL3d3dy53My5vcmcvMjAxOC9jcmVkZW50aWFscy92MSJdLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIl0sImNyZWRlbnRpYWxTdWJqZWN0Ijp7Im5hbWUiOiJPbGQgTm9yZG1hbm4ifSwiZXZpZGVuY2UiOnsidHMiOjEyfX0sInN1YiI6ImRpZDpleGFtcGxlOnN1YmplY3RZIiwibmJmIjoxNzc2NjkyNTM1LCJpc3MiOiJkaWQ6a2V5Ono2TWtwTTVXeXplRWJhZ01iY1p2anM2Zk5kNlJSdGdpa0tDVEVCS2lkSkV4RzdocCJ9.zJmb_US3qfSx_przhr1J9lu3JfVxjM185yoedtzdwGq4jzlWuBOuKr2xONHxCOe4sYD3fFYTUbG5_q1xTRiCCA';
  const payload0 = decodeJwt(jwt);
  console.log("payload", JSON.stringify(payload0, null, 2));
  const {payload, protectedHeader} = await jwtVerify(jwt, key);

  const raw = await genX509();
  console.log(raw);
  console.log(Buffer.from(raw).toString("base64"));
  const asn1 = asn1js.fromBER(raw);
  const cert = new pkijs.Certificate({ schema: asn1.result });

  console.log("Subject:", cert.subject.typesAndValues);
  console.log("Issuer:", cert.issuer.typesAndValues);
  console.log("Valid from:", cert.notBefore.value);
  console.log("Valid to:", cert.notAfter.value);
*/
}

async function generateKeyPair() {
  const crypto = pkijs.getCrypto(true);

  return crypto.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"]
  );
}

async function createRootCert() {
  const keys = await generateKeyPair();
  const cert = new pkijs.Certificate();

  cert.version = 2;
  cert.serialNumber = new asn1js.Integer({ value: 1 });

  cert.issuer.typesAndValues.push(
      new pkijs.AttributeTypeAndValue({
        type: OID.CN,
        value: new asn1js.Utf8String({ value: "My Root CA" }),
      })
  );
  cert.issuer.typesAndValues.push(
      new pkijs.AttributeTypeAndValue({
        type: OID.O,
        value: new asn1js.Utf8String({ value: "Carmentis SAS" }),
      })
  );

  cert.subject.typesAndValues = cert.issuer.typesAndValues;

  cert.notBefore.value = new Date();
  cert.notAfter.value = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  await cert.subjectPublicKeyInfo.importKey(keys.publicKey);

  cert.extensions = [
    new pkijs.Extension({
      extnID: "2.5.29.19", // BasicConstraints
      critical: true,
      extnValue: new pkijs.BasicConstraints({
        cA: true,
      }).toSchema().toBER(false),
    }),
  ];

  await cert.sign(keys.privateKey, "SHA-256");

  return { cert, keys };
}

async function createLeafCert(rootCert: pkijs.Certificate, rootKeys: CryptoKeyPair) {
  const leafKeys = await generateKeyPair();

  const cert = new pkijs.Certificate();

  cert.version = 2;
  cert.serialNumber = new asn1js.Integer({ value: 2 });

  // issuer = root
  cert.issuer.typesAndValues = rootCert.subject.typesAndValues;

  // subject = leaf
  cert.subject.typesAndValues.push(
      new pkijs.AttributeTypeAndValue({
        type: OID.CN,
        value: new asn1js.Utf8String({ value: "Leaf Cert" }),
      })
  );
  cert.subject.typesAndValues.push(
      new pkijs.AttributeTypeAndValue({
        type: OID.O,
        value: new asn1js.Utf8String({ value: "ACME SA" }),
      })
  );

  cert.notBefore.value = new Date();
  cert.notAfter.value = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  await cert.subjectPublicKeyInfo.importKey(leafKeys.publicKey);

  cert.extensions = [
    new pkijs.Extension({
      extnID: "2.5.29.19",
      critical: true,
      extnValue: new pkijs.BasicConstraints({
        cA: false,
      }).toSchema().toBER(false),
    }),
  ];

  await cert.sign(rootKeys.privateKey, "SHA-256");

  return { cert, keys: leafKeys };
}

function derToCert(der: ArrayBuffer): pkijs.Certificate {
  const asn1 = asn1js.fromBER(der);

  if (asn1.offset === -1) {
    throw new Error("Invalid DER");
  }

  return new pkijs.Certificate({ schema: asn1.result });
}

function getOid(names: pkijs.RelativeDistinguishedNames, oid: string): string | undefined {
  const cnAttr = names.typesAndValues.find(
      (attr) => attr.type === oid
  );

  return cnAttr?.value.valueBlock.value;
}

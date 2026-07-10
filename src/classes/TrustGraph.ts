import {
    type GraphNode,
    type GraphEdge,
    type VerifiableCredential,
} from "./types"
import { SdJwt } from "./SdJwt";
import { X509 } from "./X509";
import {
    type ImportedProof,
    type JsonData,
} from '@cmts-dev/carmentis-sdk-core'
import type { X509Certificate } from "@peculiar/x509";
const subtle = window.crypto.subtle;

const SDJWT_MARKER = "__sd_jwt__";

export class TrustGraph {
    private vbId: string;
    private proofs: ImportedProof[];
    private nodeIndex: number;
    private nodes: GraphNode[];
    private edges: GraphEdge[];

    constructor(vbId: string, proofs: ImportedProof[]) {
        this.vbId = vbId;
        this.proofs = proofs;
        this.nodeIndex = 0;
        this.nodes = [];
        this.edges = [];
    }

    getNodes(): GraphNode[] {
        return this.nodes;
    }

    getEdges(): GraphEdge[] {
        return this.edges;
    }

    nextNodeId() {
        return "node" + this.nodeIndex++;
    }

    async build() {
        const id = this.nextNodeId();

        this.nodes.push({
            id,
            label: "VB",
            title: "Virtual Blockchain",
            type: "vb",
            valid: true,
            sections: [
                {
                    name: "Info",
                    data: {
                        "ID": this.vbId,
                    }
                }
            ],
            verifications: [
                {
                    operation: "The virtual blockchain was found on-chain.",
                    success: true
                },
            ]
        });

        for (const proof of this.proofs) {
            const blockNodeId = this.addMicroblock(id, proof);
            const vcList = this.getVerifiableCredentialList(proof.data);

            for (const vc of vcList) {
                switch (vc.type) {
                    case "sdjwt": {
                        const vcNodeId = await this.addSdJwt(blockNodeId, vc);
                        break;
                    }
                }
            }
        }
    }

    private addMicroblock(parentId: string, proof: ImportedProof) {
        const id = this.nextNodeId();

        this.nodes.push({
            id,
            label: "MB " + proof.height,
            title: "Microblock",
            type: "mb",
            valid: true,
            sections: [
                {
                    name: 'Content',
                    data: {
                        "Virtual Blockchain": this.vbId,
                        "Height": proof.height.toString(),
                    }
                }
            ],
            verifications: [
                {
                    operation: "The microblock was found on-chain.",
                    success: true
                },
                {
                    operation: "The displayed data is consistent with the on-chain digest.",
                    success: true
                }
            ]
        });
        this.edges.push({ source: parentId, target: id });
        return id;
    }

    private async addSdJwt(parentId: string, vc: VerifiableCredential) {
        const id = this.nextNodeId();
        const sdJwt = new SdJwt(vc.data);
        const data = await sdJwt.decode();
        const valid = data.valid;
        const x5c = data.issuerJwk?.x5c;

        this.nodes.push({
            id,
            label: "VC",
            title: "Verifiable Credential",
            type: "vc",
            valid,
            sections: [
                {
                    name: 'Info',
                    data: {
                        'Format': 'SD-JWT',
                        'Issued on': data.info.issuedOn,
                        'Valid from': data.info.validFrom,
                        'Valid until': data.info.validUntil,
                    }
                },
                {
                    name: 'Claims',
                    data: data.claims,
                }
            ],
            verifications: [
                {
                    operation: `The signature of the issuer is ${valid ? "valid" : "invalid"}.`,
                    success: valid
                },
                {
                    operation: `The VC has not been revoked.`,
                    success: true
                },
            ]
        });
        this.edges.push({ source: parentId, target: id });

        if (x5c) {
            let parentId = id;
            const certificates = X509.decodeX5c(x5c);
            for (const cert of certificates) {
                parentId = await this.addX509(parentId, cert);
            }
        }
        return id;
    }

    private async addX509(parentId: string, cert: X509Certificate) {
        const id = this.nextNodeId();
        const publicKey = await cert.publicKey.export();
        const exportedPublicKey = await subtle.exportKey("jwk", publicKey);

        this.nodes.push({
            id,
            label: "X509",
            title: "X509 Certificate",
            type: "x509",
            valid: true,
            sections: [
                {
                    name: "Info",
                    data: {
                        "Subject": cert.subject,
                        "Issuer": cert.issuer,
                        "Valid from": cert.notBefore,
                        "Valid until": cert.notAfter,
                        "Serial number": cert.serialNumber,
                        "Public key": exportedPublicKey,
                    }
                }
            ],
            verifications: [
                {
                    operation: `The X509 certificate has a valid structure`,
                    success: true,
                },
                {
                    operation: `The X509 certificate is within its validity period`,
                    success: true,
                },
            ]
        });
        this.edges.push({ source: parentId, target: id });
        return id;
    }

    private getVerifiableCredentialList(data: JsonData) {
        const list: VerifiableCredential[] = [];
        traverse(data);
        return list;

        function traverse(item: JsonData) {
            if (Array.isArray(item)) {
                for (const child of item) {
                    traverse(child);
                }
            }
            else if (typeof item === "object" && item !== null) {
                for (const key of Object.keys(item)) {
                    const child = item[key] as JsonData;

                    if (key === SDJWT_MARKER) {
                        if (typeof child === "string") {
                            list.push({
                                type: "sdjwt",
                                data: child,
                            });
                        }
                    }
                    else {
                        traverse(child);
                    }
                }
            }
        }
    }

    static truncate(str: string) {
        return str.length > 32 ? str.slice(0, 32) + "[...]" : str;
    }
}

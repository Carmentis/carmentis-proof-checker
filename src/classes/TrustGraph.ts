import {
    type GraphNode,
    type GraphEdge,
    type TaggedContent,
} from "./types"
import { SdJwt, X509 } from "@cmts-dev/carmentis-sdk-core";
import {
    type ImportedProof,
    type JsonData,
} from '@cmts-dev/carmentis-sdk-core'
const subtle = window.crypto.subtle;

const SDJWT_MARKER = "__sd_jwt__";
const X509_MARKER = "__x509__";

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
            const taggedContent = this.getTaggedContent(proof.data);

            for (const content of taggedContent) {
                switch (content.type) {
                    case "sdjwt": {
                        const vcNodeId = await this.addSdJwt(blockNodeId, content.data);
                        break;
                    }
                    case "x509": {
                        const cert = X509.fromString(content.data);
                        const x509NodeId = await this.addX509(blockNodeId, cert);
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

    private async addSdJwt(parentId: string, jwt: string) {
        const id = this.nextNodeId();
        const sdJwt = new SdJwt(jwt);
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
                        'Issued on': data.info.issuedOn || "-",
                        'Valid from': data.info.validFrom || "-",
                        'Valid until': data.info.validUntil || "-",
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
            const certificates = X509.fromX5c(x5c);
            for (const cert of certificates) {
                parentId = await this.addX509(parentId, cert);
            }
        }
        return id;
    }

    private async addX509(parentId: string, cert: X509) {
        const id = this.nextNodeId();
        const publicKey = await cert.getPublicKey();
        const info = await cert.getInformation();
        const extensions = cert.getExtensions();
        const exportedPublicKey = await subtle.exportKey("jwk", publicKey);
        const lei = extensions["1.3.6.1.4.1.52266.1"]?.values?.[0];
        const data = {
            "Subject": cert.getSubject(),
            "Issuer": cert.getIssuer(),
            "Valid from": info.notBefore,
            "Valid until": info.notAfter,
            "Serial number": info.serialNumber,
            ...lei ? { "LEI": lei } : {},
            "Public key": exportedPublicKey,
        };

        this.nodes.push({
            id,
            label: "X509",
            title: "X509 Certificate",
            type: "x509",
            valid: true,
            sections: [
                {
                    name: "Info",
                    data
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

    private getTaggedContent(data: JsonData) {
        const list: TaggedContent[] = [];
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
                    else if (key === X509_MARKER) {
                        if (typeof child === "string") {
                            list.push({
                                type: "x509",
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

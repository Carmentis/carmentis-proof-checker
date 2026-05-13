import {
    type GraphNode,
    type GraphEdge,
    type VerifiableCredential,
} from "./types"
import { SdJwt } from "./SdJwt";
import {
    type ImportedProof,
    type JsonData,
} from '@cmts-dev/carmentis-sdk-core'

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
        for (const proof of this.proofs) {
            const blockNodeId = this.addBlock(proof);
            const vcList = this.getVerifiableCredentialList(proof.data);

            for (const vc of vcList) {
                switch (vc.type) {
                    case "sdjwt": {
                        const vcNodeId = await this.addSdJwt(vc);
                        this.edges.push({ source: blockNodeId, target: vcNodeId });
                        break;
                    }
                }
            }
        }
    }

    private addBlock(proof: ImportedProof) {
        const id = this.nextNodeId();

        this.nodes.push({
            id,
            label: "Block " + proof.height,
            type: "block",
            valid: true,
            sections: [
                {
                    name: 'Content',
                    data: {
                        "Virtual Blockchain": TrustGraph.truncate(this.vbId),
                        "Height": proof.height.toString(),
                    }
                }
            ],
            verifications: [
                {
                    operation: "The Merkle root hash matches the on-chain value.",
                    success: true
                }
            ]
        });
        return id;
    }

    private async addSdJwt(vc: VerifiableCredential) {
        const id = this.nextNodeId();
        const sdJwt = new SdJwt(vc.data);
        const data = await sdJwt.decode();
        const valid = data.valid;

        for (const key of Object.keys(data.claims)) {
            if (typeof data.claims[key] === "string") {
                data.claims[key] = TrustGraph.truncate(data.claims[key]);
            }
        }

        this.nodes.push({
            id,
            label: "VC",
            type: "vc",
            valid: valid,
            sections: [
                {
                    name: 'Info',
                    data: {
                        'Format': 'SD-JWT',
                        'Issued on': data.info.issuedOn,
                        'Valid from': data.info.validFrom,
                        'Valid until': data.info.validUntil,
                        'Issuer': TrustGraph.truncate(data.info.issuer),
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

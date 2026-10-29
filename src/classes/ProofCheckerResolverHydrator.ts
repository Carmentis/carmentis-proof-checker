import {
    Hash,
    Provider,
    type JsonData,
    type MbRef,
    type ResolverHydrator,
    type ResolutionProofProofs,
} from "@cmts-dev/carmentis-sdk-core";

export class ProofCheckerResolverHydrator implements ResolverHydrator {
    private readonly provider: Provider;
    private readonly proofs: ResolutionProofProofs;
    /** Raw record data of every hydrated microblock, kept so tags inside it can be inspected. */
    readonly hydrated: JsonData[] = [];

    constructor(provider: Provider, proofs: ResolutionProofProofs) {
        this.provider = provider;
        this.proofs = proofs;
    }

    async hydrateMicroblock(link: string, mbRef: MbRef) {
        const proof = this.proofs[link];
        if (proof === undefined) {
            throw new Error(`proof not found for '${link}'`);
        }
        const vb = proof.virtualBlockchains[0];
        if (vb === undefined) {
            throw new Error(`no virtual blockchain in proof for '${link}'`);
        }
        const vbId = vb.id;
        const appLedgerIdHash = Hash.fromHex(vbId);
        const appLedgerVb = await this.provider.loadApplicationLedgerVirtualBlockchain(appLedgerIdHash);
        const mb = vb.microblocks[0];
        if (mb === undefined) {
            throw new Error(`microlblock not found in proof for '${link}'`);
        }
        const data = await appLedgerVb.importMicroblockProof(mb);
        this.hydrated.push(data);
        return data;
    }
}

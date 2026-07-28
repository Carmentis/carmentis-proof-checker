import { useStorageStore } from '../stores/storage'

export class Network {
    static getNodeEndpoint(id: string) {
        const store = useStorageStore();
        const org = store.organizations.find((org) => org.id == id);
        return org?.nodeEndpoint ?? "";
    }

    static getExplorerUrl(id: string) {
        const store = useStorageStore();
        const org = store.organizations.find((org) => org.id == id);
        return org?.explorerUrl ?? "";
    }
}

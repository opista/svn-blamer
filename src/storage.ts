export class Storage<T> {
    private storage: Map<string, T> = new Map();

    get(key: string): T | undefined {
        return this.storage.get(key);
    }

    set(key: string, value: T): void {
        this.storage.set(key, value);
    }

    delete(key: string): void {
        this.storage.delete(key);
    }

    clear(): void {
        this.storage.clear();
    }
}

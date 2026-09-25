export class BinaryFileError extends Error {
    constructor(public readonly fileName: string) {
        super("SVN considers this file binary.");
        this.name = "BinaryFileError";
    }
}

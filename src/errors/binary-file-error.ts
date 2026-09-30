export class BinaryFileError extends Error {
    constructor(public readonly fileName: string) {
        super("SVN considers this a binary file.");
        this.name = "BinaryFileError";
    }
}

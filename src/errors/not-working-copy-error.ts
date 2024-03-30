export class NotWorkingCopyError extends Error {
    constructor(public fileName: string) {
        super("File is not a working copy");
    }
}

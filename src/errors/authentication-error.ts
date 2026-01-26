export class AuthenticationError extends Error {
    constructor(public readonly fileName: string) {
        super(`Authentication failed for file: ${fileName}`);
        this.name = "AuthenticationError";
    }
}

export class SvnCommandError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SvnCommandError";
        Object.setPrototypeOf(this, SvnCommandError.prototype);
    }
}

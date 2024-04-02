export class ConfigurationError extends Error {
    constructor(
        public property: string,
        public value: any,
    ) {
        super(`Setting: ${property} is not configured correctly. Value is "${value}"`);
    }
}

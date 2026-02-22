export class ConfigurationError extends Error {
    constructor(
        public property: string,
        public value: unknown,
    ) {
        super(
            `Setting: ${property} is not configured correctly. Value is "${typeof value === "object" && value !== null ? JSON.stringify(value) : value}"`,
        );
    }
}

export class ActionError extends Error {
    constructor(
        public readonly status: 400 | 404 | 409,
        public readonly code: string,
        message: string,
    ) {
        super(message);
        this.name = 'ActionError';
    }
}

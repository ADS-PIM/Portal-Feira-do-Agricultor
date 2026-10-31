export class AdminActionError extends Error {
    constructor(
        public readonly status: 400 | 403 | 404 | 409,
        public readonly code: string,
        message: string,
    ) {
        super(message);
        this.name = 'AdminActionError';
    }
}

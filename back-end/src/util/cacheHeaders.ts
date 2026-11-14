import type { Response } from 'express';

// The private HTTP cache and front-end data cache use the same short lifetime.
export function setPrivateReadCache(res: Response): void {
    res.setHeader('Cache-Control', 'private, max-age=30, must-revalidate');
}

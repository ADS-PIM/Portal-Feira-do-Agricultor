import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { EventDAO } from '../dao/event.dao';

const eventStatusRoutes = Router();
const eventDAO = new EventDAO();

eventStatusRoutes.get('/event-status', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const secret = process.env.CRON_SECRET;
    if (!secret) {
        return res.status(503).json({ code: 'EVENT_STATUS_SYNC_NOT_CONFIGURED' });
    }

    const expected = Buffer.from(`Bearer ${secret}`);
    const received = Buffer.from(req.get('Authorization') ?? '');
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
        return res.status(401).json({ code: 'UNAUTHORIZED' });
    }

    try {
        const updated = await eventDAO.synchronizeStates();
        return res.json({ updated });
    } catch (error) {
        console.error('Error synchronizing event states:', error);
        return res.status(500).json({ code: 'EVENT_STATUS_SYNC_FAILED' });
    }
});

export default eventStatusRoutes;

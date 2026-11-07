import app from './app';
import { EventDAO } from './dao/event.dao';
import { startEventStatusScheduler } from './service/eventStatusScheduler';

const port = process.env.PORT || 8080;

const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// Vercel uses the scheduled HTTP route: its processes can be suspended at any time.
if (process.env.VERCEL !== '1') {
    const eventDAO = new EventDAO();
    const stop = startEventStatusScheduler(() => eventDAO.synchronizeStates());
    server.once('close', stop);
}

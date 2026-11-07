export function startEventStatusScheduler(synchronize: () => Promise<unknown>): () => void {
    let running = false;
    const run = async () => {
        if (running) return;
        running = true;
        try {
            await synchronize();
        } catch (error) {
            console.error('Error synchronizing event states:', error);
        } finally {
            running = false;
        }
    };

    void run();
    const timer = setInterval(() => void run(), 60_000);
    timer.unref();
    return () => clearInterval(timer);
}

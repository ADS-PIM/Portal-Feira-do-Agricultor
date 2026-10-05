import express from 'express';
import dotenv from 'dotenv';
import path from 'node:path';
import routes from './routes/index';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();

const allowedOrigins = new Set(
    (process.env.FRONTEND_URL || 'http://localhost:5173')
        .split(',')
        .map(origin => origin.trim().replace(/\/+$/, ''))
        .filter(Boolean)
);

app.use((req, res, next) => {
    const origin = req.headers.origin?.replace(/\/+$/, '');
    if (origin && allowedOrigins.has(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Credentials', 'true');
        res.header('Vary', 'Origin');
    }

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

app.use(express.json());

app.use((req, _res, next) => {
    const cookieHeader = req.headers.cookie || '';
    (req as typeof req & { cookies: Record<string, string> }).cookies = Object.fromEntries(
        cookieHeader.split(';').filter(Boolean).map(cookie => {
            const separator = cookie.indexOf('=');
            return [cookie.slice(0, separator).trim(), decodeURIComponent(cookie.slice(separator + 1).trim())];
        })
    );
    next();
});

app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

app.use(routes);

export default app;

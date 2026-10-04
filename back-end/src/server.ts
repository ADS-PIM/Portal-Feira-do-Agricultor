import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import routes from './routes/index';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const port = process.env.PORT;

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:5173');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Credentials', 'true');
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

app.use(express.static(path.resolve(__dirname, '../../front-end')));
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

app.use(routes);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
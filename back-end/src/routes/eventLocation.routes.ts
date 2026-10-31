import { Router } from 'express';
import authToken from '../../authMiddleware';
import { authenticatedRateLimit, rateLimit } from '../rateLimit/middleware';
import { searchLocationHistory } from '../dao/eventLocation.dao';
import { LocationSearchService } from '../service/locationSearch.service';

const routes = Router();
const searchService = new LocationSearchService();
routes.use(authToken, authenticatedRateLimit);
routes.get('/history', async (req, res) => {
    const query = req.query.q ?? '';
    if (typeof query !== 'string' || query.length > 200) {
        res.status(400).json({ error: 'Pesquisa inválida.' }); return;
    }
    res.setHeader('Cache-Control', 'no-store');
    try {
        res.json(await searchLocationHistory(query.trim()));
    } catch {
        res.status(503).json({ error: 'Não foi possível carregar o histórico de locais.' });
    }
});
routes.get('/search', rateLimit('GEOCODING', 'event:location-search', req => req.admin?.adminId), async (req, res) => {
    const query = req.query.q;
    if (typeof query !== 'string' || query.trim().length < 3 || query.length > 200) {
        res.status(400).json({ error: 'Pesquise um local usando entre 3 e 200 caracteres.' }); return;
    }
    res.setHeader('Cache-Control', 'no-store');
    try {
        res.json(await searchService.search(query.trim()));
    } catch {
        res.status(503).json({ error: 'A pesquisa de locais está indisponível. Selecione um ponto no mapa ou use o histórico.' });
    }
});
export default routes;

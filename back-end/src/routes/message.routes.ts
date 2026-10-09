import { Router } from 'express';
import authToken from '../../authMiddleware';
import { MessageController } from '../controller/message.controller';
import { MessageDAO } from '../dao/message.dao';
import { MessageService } from '../service/message.service';

const messageRoutes = Router();
const messageDAO = new MessageDAO();
const messageService = new MessageService(messageDAO);
const messageController = new MessageController(messageService);

messageRoutes
    .route('/create')
    .post(async (req, res) => messageController.create(req, res));

messageRoutes
    .route('/:id/read')
    .patch(authToken, async (req, res) => messageController.markAsRead(req, res));

messageRoutes
    .route('/:id')
    .delete(authToken, async (req, res) => messageController.delete(req, res))
    .get(authToken, async (req, res) => messageController.searchById(req, res));

messageRoutes
    .route('/')
    .get(authToken, async (req, res) => messageController.search(req, res));

//Não fiz rota de edição pq n vai ser necessario atualmente, o usuarios vai mandar a menssagem e depois disso ele não vai mais ter acesso a ela,
// o admin vai poder deletar depois de ler.

export default messageRoutes;
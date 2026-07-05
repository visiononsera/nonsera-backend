import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { PORT, NODE_ENV } from './config/env';
import { setupSocketIO } from './services/socket.service';
import { AppwriteService } from './services/appwrite.service';
import logger from './utils/logger';
// Chargement des tâches d'arrière-plan automatisées (Cron)
import './jobs/stars.cron';
import './jobs/podium.cron';
import './jobs/bonus_expire.cron';
const server = http.createServer(app);
// Initialisation de la couche Socket.io avec configuration CORS unifiée
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
// Exécution du raccordement des événements
setupSocketIO(io);
globalThis.io = io;
// server.listen(PORT, '192.168.17.151', () => {
server.listen(PORT, () => {
    logger.info(`[${NODE_ENV}] Serveur unifié à l'écoute sur le port : ${PORT}`);
    // logger.info(`Swagger UI disponible sur http:// 192.168.17.151:${PORT}/api-docs`);
    logger.info(`Swagger UI disponible sur http:// localhost:${PORT}/api-docs`);
});
//# sourceMappingURL=server.js.map
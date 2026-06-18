import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { PORT, NODE_ENV } from './config/env';
import { setupSocketIO } from './services/socket.service';
import logger from './utils/logger';

// Chargement des tâches d'arrière-plan automatisées (Cron)
import './cron/starsCron';

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

// Enregistrement global de l'instance pour accessibilité externe dans le projet
declare global {
  var io: Server;
}
globalThis.io = io;

server.listen(PORT, () => {
  logger.info(`[${NODE_ENV}] Serveur unifié à l'écoute sur le port : ${PORT}`);
  logger.info(`Swagger UI disponible sur http://localhost:${PORT}/api-docs`);
});
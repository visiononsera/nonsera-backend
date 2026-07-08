import http from 'http';
import app from './app.js';
import { Server } from 'socket.io';
import logger from './utils/logger.js';
import { PORT, NODE_ENV } from './config/env.js';
import { setupSocketIO } from './services/socket.service.js';

// import './jobs/stars.cron.js';
import './jobs/podium.cron.js';
import './jobs/bonus_expire.cron.js';

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});

setupSocketIO(io);

globalThis.io = io;

server.listen(PORT, () => {
  logger.info(`[${NODE_ENV}] Serveur unifié à l'écoute sur le port : ${PORT}`);
  logger.info(`Swagger UI disponible sur http://localhost:${PORT}/api-docs`);
});
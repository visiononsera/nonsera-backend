import { Server } from 'socket.io';
import './jobs/stars.cron';
import './jobs/podium.cron';
import './jobs/bonus_expire.cron';
declare global {
    var io: Server;
}
//# sourceMappingURL=server.d.ts.map
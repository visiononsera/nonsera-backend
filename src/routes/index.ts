import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./users.routes";
import videoRoutes from "./video.routes";
import walletRoutes from "./wallet.routes";
import searchRoutes from "./search.routes";
import podiumRoutes from "./podium.routes";
import companyRoutes from "./company.routes";
import reservationRoutes from "./reservation.routes";

const apiRouter = Router();

apiRouter.use(authRoutes);
apiRouter.use(userRoutes);
apiRouter.use(videoRoutes);
apiRouter.use(walletRoutes);
apiRouter.use(searchRoutes);
apiRouter.use(podiumRoutes);
apiRouter.use(companyRoutes);
apiRouter.use(reservationRoutes);

export default apiRouter;
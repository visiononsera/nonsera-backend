import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./users.routes";
import videoRoutes from "./video.routes";
import walletRoutes from "./wallet.routes";
import searchRoutes from "./search.routes";
import podiumRoutes from "./podiums.routes";
import companyRoutes from "./companies.routes";
import reservationRoutes from "./reservations.routes";
import matchRoutes from "./match.routes";
import giftsRoutes from "./gifts.routes";

const apiRouter = Router();

apiRouter.use(authRoutes);
apiRouter.use(userRoutes);
apiRouter.use(videoRoutes);
apiRouter.use(walletRoutes);
apiRouter.use(searchRoutes);
apiRouter.use(podiumRoutes);
apiRouter.use(companyRoutes);
apiRouter.use(reservationRoutes);
apiRouter.use(matchRoutes);
apiRouter.use(giftsRoutes);

export default apiRouter;
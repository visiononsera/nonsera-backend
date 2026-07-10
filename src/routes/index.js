import { Router } from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./users.routes.js";
import videoRoutes from "./video.routes.js";
import walletRoutes from "./wallet.routes.js";
import searchRoutes from "./search.routes.js";
import podiumRoutes from "./podiums.routes.js";
import companyRoutes from "./companies.routes.js";
import reservationRoutes from "./reservations.routes.js";
import matchRoutes from "./match.routes.js";
import giftsRoutes from "./gifts.routes.js";
import annoncesRoutes from "./annonces.routes.js";
import coffretsRoutes from "./coffrets.routes.js";
import moreauRoutes from "./moreau.routes.js";
import chatRoutes from "./chat.routes.js";
import enveloppeRoutes from "./enveloppe.routes.js";

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
apiRouter.use(annoncesRoutes);
apiRouter.use(coffretsRoutes);
apiRouter.use(moreauRoutes);
apiRouter.use(chatRoutes);
apiRouter.use(enveloppeRoutes);

export default apiRouter;
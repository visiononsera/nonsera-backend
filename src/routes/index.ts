import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./users.routes";
import videoRoutes from "./video.routes";

const apiRouter = Router();

apiRouter.use(authRoutes);
apiRouter.use(userRoutes);
apiRouter.use(videoRoutes);

export default apiRouter;
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import fs from "fs";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import { errorHandler } from "./middlewares/error.middleware";
import apiRouter from "./routes";
const app = express();
// 1. Parsing de la documentation Swagger (Robuste en Dev et en Prod)
const swaggerPath = path.join(process.cwd(), "docs", "swagger.yaml");
const swaggerOutputFile = fs.readFileSync(swaggerPath, "utf8");
const swaggerDocument = YAML.parse(swaggerOutputFile);
// Configuration des modules middleware de sécurité
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use("/api/v1", apiRouter);
// 2. Routage des médias statiques basé sur la racine du projet
app.use("/api/v1/uploads", express.static(path.join(process.cwd(), "public/uploads")));
// Routes Documentation et diagnostic de l'application
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get("/", (req, res) => {
    res.status(200).send("<h1>Nonsera Unified Backend Engine</h1>");
});
// Middleware d'interception d'erreur global
app.use(errorHandler);
export default app;
//# sourceMappingURL=app.js.map
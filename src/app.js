import express from "express";
import fs from "fs";
import cors from "cors";
import path from "path";
import YAML from "yamljs";
import helmet from "helmet";
import morgan from "morgan";
import { globSync } from "glob";
import apiRouter from "./routes/index.js";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import { errorHandler } from "./middlewares/error.middleware.js";

const app = express();


// A CORRIGER ULTERIEUREMENT
// -----------------------------------------------------------------------------
// Swagger Configuration
// -----------------------------------------------------------------------------
// const swaggerOptions = {
//   definition: {
//     openapi: "3.0.3",
//     info: {
//       title: "Nonsera Unified Backend API",
//       version: "1.0.0",
//       description: "Official REST API documentation",
//     },

//     servers: [
//       {
//         url: "http://localhost:3000/api/v1",
//       },
//     ],

//     components: {
//       securitySchemes: {
//         bearerAuth: {
//           type: "http",
//           scheme: "bearer",
//           bearerFormat: "JWT",
//         },
//       },
//     },
//   },

//   apis: [
//    "src/routes/**/*.js",
//     "src/docs/**/*.yaml",
//   ],
// };

// let swaggerDocument = {};

// try {
//   console.log("\n=====================================");
//   console.log("      SWAGGER SCAN STARTED");
//   console.log("=====================================\n");

//   // --------------------------------------------------
//   // Display scanned files
//   // --------------------------------------------------

//   let scannedFiles = [];

//   for (const pattern of swaggerOptions.apis) {
//     console.log(`Pattern : ${pattern}`);

//     const files = globSync(pattern);

//     if (files.length === 0) {
//       console.warn("   -> No file found");
//     } else {
//       files.forEach(file => {
//         console.log(`   ✓ ${path.relative(process.cwd(), file)}`);
//       });
//     }

//     scannedFiles.push(...files);
//   }

//   console.log("");

//   if (scannedFiles.length === 0) {
//     console.warn("No Swagger source files found.\n");
//   } else {
//     console.log(`${scannedFiles.length} file(s) detected.\n`);
//   }

//   // --------------------------------------------------
//   // Generate documentation
//   // --------------------------------------------------

//   swaggerDocument = swaggerJsdoc(swaggerOptions);

//   const paths = swaggerDocument.paths || {};

//   console.log("-------------------------------------");
//   console.log("Discovered API paths");
//   console.log("-------------------------------------");

//   if (Object.keys(paths).length === 0) {
//     console.warn("No OpenAPI routes detected.");
//     console.warn("This usually means:");
//     console.warn(" - invalid @openapi YAML");
//     console.warn(" - wrong apis path");
//     console.warn(" - no @openapi comments");
//   } else {
//     Object.keys(paths).forEach(route => {
//       console.log(`✓ ${route}`);

//       Object.keys(paths[route]).forEach(method => {
//         console.log(`    ${method.toUpperCase()}`);
//       });
//     });
//   }

//   console.log("");

//   console.log(
//     `Swagger generation completed (${Object.keys(paths).length} endpoint(s)).`
//   );

//   const docsDir = path.resolve(process.cwd(), "docs");

//   if (!fs.existsSync(docsDir)) {
//     fs.mkdirSync(docsDir, { recursive: true });
//   }

//   fs.writeFileSync(
//     path.join(docsDir, "swagger.yaml"),
//     YAML.stringify(swaggerDocument, 10)
//   );

//   console.log(`swagger.yaml saved to ${docsDir}`);

// } catch (err) {
//   console.error("\nSwagger generation failed.\n");
//   console.error(err);
// }

// Configuration des middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use("/api/v1", apiRouter);

app.use(
  "/api/v1/uploads",
  express.static(path.resolve(process.cwd(), "public/uploads")),
);

// Route Swagger
// app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/", (req, res) => {
  res.status(200).send("<h1>Nonsera Unified Backend Engine</h1>");
});

app.use(errorHandler);

export default app;

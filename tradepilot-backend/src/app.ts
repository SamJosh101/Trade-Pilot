import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { env } from "./config/env";

const app = express();

app.use(helmet());
// Allow multiple origins for development
const corsOrigins = env.corsOrigin.split(',').map(o => o.trim());
app.use(cors({ origin: corsOrigins }));
app.use(express.json());

if (env.nodeEnv !== "production") {
  app.use(morgan("dev"));
}

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api", routes);

// Must be registered last â€” after all routes â€” so it catches every next(err).
app.use(errorHandler);

export default app;

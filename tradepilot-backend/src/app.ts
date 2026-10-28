import {authMiddleware} from "./middleware/authMiddleware";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { env } from "./config/env";
import {stagingGate} from './security/stagingGate';

const app = express();

app.use(helmet());
app.use(stagingGate(env));
app.use(cors({
  origin: env.nodeEnv === "production"
    ? env.corsOrigin
    : (origin, callback) => {
        if (!origin || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
}));
app.use("/api/v1.1",authMiddleware,express.json({limit:"2mb"}));
app.use(['/api/notes','/api/note-folders','/api/gameplans','/api/strategies'],authMiddleware,express.json({limit:'256kb'}));
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

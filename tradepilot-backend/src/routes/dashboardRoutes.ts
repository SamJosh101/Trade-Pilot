import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import * as dashboardController from "../controllers/dashboardController";

const router = Router();

router.use(authMiddleware);

router.get("/metrics", dashboardController.getMetrics);

export default router;

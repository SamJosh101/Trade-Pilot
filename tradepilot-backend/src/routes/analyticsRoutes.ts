import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import * as analyticsController from "../controllers/analyticsController";

const router = Router();

router.use(authMiddleware);
router.get("/", analyticsController.getAnalytics);

export default router;

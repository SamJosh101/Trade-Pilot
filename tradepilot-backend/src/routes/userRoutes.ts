import { Router } from "express";
import * as authController from "../controllers/authController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.get("/me", authMiddleware, authController.me);

export default router;

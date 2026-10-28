import { Router } from "express";
import * as authController from "../controllers/authController";
import { authMiddleware } from "../middleware/authMiddleware";
import {validate} from '../middleware/validate';
import {profileUpdateSchema} from '../schemas/profileSchemas';
import {authRateLimiter} from '../middleware/rateLimiter';

const router = Router();

router.get("/me", authMiddleware, authController.me);
router.patch('/me',authMiddleware,authRateLimiter,validate(profileUpdateSchema),authController.updateProfile);

export default router;

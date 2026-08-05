import { Router } from "express";
import * as authController from "../controllers/authController";
import { validate } from "../middleware/validate";
import { authRateLimiter } from "../middleware/rateLimiter";
import { registerSchema, loginSchema } from "../schemas/authSchemas";

const router = Router();

// Public — no authMiddleware here, but rate-limited against brute force.
router.use(authRateLimiter);
router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);

export default router;

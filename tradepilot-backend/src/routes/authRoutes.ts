import { Router } from "express";
import * as authController from "../controllers/authController";
import { validate } from "../middleware/validate";
import { authRateLimiter } from "../middleware/rateLimiter";
import { registerSchema, loginSchema } from "../schemas/authSchemas";

const router = Router();

// Public — no authMiddleware here, but rate-limited against brute force.
router.use(authRateLimiter);
// Intentionally closed: no real email adapter, verified sender or recovery redirect is configured.
router.post(['/forgot-password','/reset-password'],(_q,r)=>{r.setHeader('Cache-Control','no-store');r.status(503).json({error:'Password recovery is not enabled. Email delivery and security configuration must be approved and tested first.'});});
router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);

export default router;

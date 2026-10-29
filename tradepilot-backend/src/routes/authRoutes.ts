import { Router } from "express";
import * as authController from "../controllers/authController";
import { validate } from "../middleware/validate";
import { authRateLimiter } from "../middleware/rateLimiter";
import { registerSchema, loginSchema } from "../schemas/authSchemas";
import * as recovery from '../security/recovery';
import {z} from 'zod';
import {AppError} from '../utils/AppError';

const router = Router();

// Public — no authMiddleware here, but rate-limited against brute force.
router.use(authRateLimiter);
router.get('/recovery-capabilities',async(_q,r,n)=>{try{r.setHeader('Cache-Control','no-store');r.json({enabled:await recovery.recoveryReady()});}catch(e){n(e);}});
router.post('/forgot-password',async(q,r,n)=>{const start=Date.now();r.setHeader('Cache-Control','no-store');try{const parsed=z.object({email:z.string().max(254)}).strict().safeParse(q.body);if(!parsed.success)throw new AppError('Invalid recovery request',400);const result=await recovery.requestRecovery(parsed.data.email);await new Promise(resolve=>setTimeout(resolve,Math.max(0,350-(Date.now()-start))));r.status(202).json(result);}catch(e){n(e);}});
router.post('/reset-password',async(q,r,n)=>{r.setHeader('Cache-Control','no-store');try{const parsed=z.object({token:z.string().max(128),newPassword:z.string().max(128)}).strict().safeParse(q.body);if(!parsed.success)throw new AppError('Invalid recovery request',400);r.json(await recovery.resetPassword(parsed.data.token,parsed.data.newPassword));}catch(e){n(e);}});
router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);

export default router;

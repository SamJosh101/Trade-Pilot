import rateLimit from 'express-rate-limit';
import * as deletion from '../services/tradeDeletionService';
import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import { tradeSchema, tradeUpdateSchema } from "../schemas/tradeSchemas";
import * as tradeController from "../controllers/tradeController";

const router = Router();

// Every route below requires a valid JWT.
router.use(authMiddleware);
const deletionLimit=rateLimit({windowMs:60000,limit:180,keyGenerator:req=>req.user!.id,standardHeaders:'draft-7',legacyHeaders:false,message:{error:'Too many deletion requests. Wait and retry.'}});

router.get("/", tradeController.getAll);
router.get('/:id/deletion-preview',deletionLimit,async(req,res,next)=>{try{res.setHeader('Cache-Control','no-store');res.json(await deletion.preview(req.user!.id,req.params.id as string));}catch(e){next(e);}});
router.post('/:id/unlink-notes',deletionLimit,async(req,res,next)=>{try{res.json(await deletion.unlinkNotes(req.user!.id,req.params.id as string,req.body,req.headers['if-match']));}catch(e){next(e);}});
router.get("/:id", tradeController.getOne);
router.post("/", validate(tradeSchema), tradeController.createTrade);
router.put("/:id", validate(tradeUpdateSchema), tradeController.updateTrade);
router.delete("/:id", deletionLimit,tradeController.deleteTrade);

export default router;

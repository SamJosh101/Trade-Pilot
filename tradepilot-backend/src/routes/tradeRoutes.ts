import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import { tradeSchema, tradeUpdateSchema } from "../schemas/tradeSchemas";
import * as tradeController from "../controllers/tradeController";

const router = Router();

// Every route below requires a valid JWT.
router.use(authMiddleware);

router.get("/", tradeController.getAll);
router.get("/:id", tradeController.getOne);
router.post("/", validate(tradeSchema), tradeController.createTrade);
router.put("/:id", validate(tradeUpdateSchema), tradeController.updateTrade);
router.delete("/:id", tradeController.deleteTrade);

export default router;

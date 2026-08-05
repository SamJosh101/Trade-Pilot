import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { validate } from "../middleware/validate";
import { accountSchema, accountUpdateSchema } from "../schemas/accountSchemas";
import * as accountController from "../controllers/accountController";

const router = Router();

// Every route below requires a valid JWT.
router.use(authMiddleware);

router.get("/", accountController.getAll);
router.get("/:id", accountController.getOne);
router.post("/", validate(accountSchema), accountController.createAccount);
router.put("/:id", validate(accountUpdateSchema), accountController.updateAccount);
router.delete("/:id", accountController.deleteAccount);

export default router;

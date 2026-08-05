import { Router } from "express";
import authRoutes from "./authRoutes";
import userRoutes from "./userRoutes";
import tradeRoutes from "./tradeRoutes";
import dashboardRoutes from "./dashboardRoutes";
import analyticsRoutes from "./analyticsRoutes";
import accountRoutes from "./accountRoutes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/trades", tradeRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/accounts", accountRoutes);

export default router;

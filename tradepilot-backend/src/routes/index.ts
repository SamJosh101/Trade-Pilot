import strategyPerformanceRoutes from '../strategyPerformance/routes';
import securityRoutes from '../security/routes';
import mediaRoutes from '../security/mediaRoutes';
import tradeQueryRoutes from '../tradeQuery/routes';
import strategyRoutes from './strategyRoutes';
import gameplanRoutes from './gameplanRoutes';
import financialRoutes from "./financialRoutes";
import { Router } from "express";
import authRoutes from "./authRoutes";
import userRoutes from "./userRoutes";
import tradeRoutes from "./tradeRoutes";
import dashboardRoutes from "./dashboardRoutes";
import analyticsRoutes from "./analyticsRoutes";
import accountRoutes from "./accountRoutes";
import {notesRouter,foldersRouter} from './notesRoutes';

const router = Router();

router.use("/v1.1",financialRoutes);
router.use("/auth", authRoutes);
router.use('/security',securityRoutes);
router.use('/media',mediaRoutes);
router.use("/users", userRoutes);
router.use("/trades", tradeRoutes);
router.use("/trade-query",tradeQueryRoutes);
router.use("/strategy-performance",strategyPerformanceRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/accounts", accountRoutes);
router.use('/strategies',strategyRoutes);
router.use('/gameplans',gameplanRoutes);
router.use('/notes',notesRouter);
router.use('/note-folders',foldersRouter);

export default router;

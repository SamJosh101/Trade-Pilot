import { parseAccountQuery } from "../schemas/querySchemas";
import { Request, Response, NextFunction } from "express";
import * as metricsService from "../services/metricsService";

export async function getMetrics(req: Request, res: Response, next: NextFunction) {
  try {
    const { accountId } = parseAccountQuery(req.query);
    const metrics = await metricsService.getMetrics(req.user!.id, accountId);
    res.status(200).json(metrics);
  } catch (err) {
    next(err);
  }
}

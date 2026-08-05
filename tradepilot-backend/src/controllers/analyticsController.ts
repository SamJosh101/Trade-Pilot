import { Request, Response, NextFunction } from "express";
import * as analyticsService from "../services/analyticsService";

export async function getAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const accountId = req.query.accountId as string | undefined;
    const analytics = await analyticsService.getAnalytics(req.user!.id, accountId);
    res.status(200).json(analytics);
  } catch (err) {
    next(err);
  }
}

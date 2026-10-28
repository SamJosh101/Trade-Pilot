import { parseAccountQuery, parseCalendarQuery } from "../schemas/querySchemas";
import { Request, Response, NextFunction } from "express";
import * as analyticsService from "../services/analyticsService";

export async function getAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const { accountId } = parseAccountQuery(req.query);
    const analytics = await analyticsService.getAnalytics(req.user!.id, accountId);
    res.status(200).json(analytics);
  } catch (err) {
    next(err);
  }
}

export async function getCalendar(req: Request, res: Response, next: NextFunction) {
  try {
    const { accountId, month: requestedMonth } = parseCalendarQuery(req.query);
    const month = requestedMonth ?? new Date().toISOString().slice(0, 7);

    const calendar = await analyticsService.getCalendar(req.user!.id, month, accountId);
    res.status(200).json(calendar);
  } catch (err) {
    next(err);
  }
}

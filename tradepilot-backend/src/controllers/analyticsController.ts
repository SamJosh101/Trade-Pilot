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

export async function getCalendar(req: Request, res: Response, next: NextFunction) {
  try {
    const requestedMonth = req.query.month as string | undefined;
    const accountId = req.query.accountId as string | undefined;
    const currentMonth = new Date().toISOString().slice(0, 7);
    const month = requestedMonth ?? currentMonth;

    if (!/^\d{4}-\d{2}$/.test(month)) {
      res.status(400).json({ error: "Month must be in YYYY-MM format" });
      return;
    }

    const [, monthPart] = month.split("-");
    const monthNumber = Number(monthPart);
    if (monthNumber < 1 || monthNumber > 12) {
      res.status(400).json({ error: "Month must be in YYYY-MM format" });
      return;
    }

    const calendar = await analyticsService.getCalendar(req.user!.id, month, accountId);
    res.status(200).json(calendar);
  } catch (err) {
    next(err);
  }
}

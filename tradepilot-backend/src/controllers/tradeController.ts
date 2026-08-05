import { Request, Response, NextFunction } from "express";
import * as tradeService from "../services/tradeService";

export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const accountId = req.query.accountId as string | undefined;
    const trades = await tradeService.getAllTrades(req.user!.id, accountId);
    res.status(200).json(trades);
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const trade = await tradeService.getTradeById(req.user!.id, req.params.id as string);
    res.status(200).json(trade);
  } catch (err) {
    next(err);
  }
}

export async function createTrade(req: Request, res: Response, next: NextFunction) {
  try {
    const trade = await tradeService.createTrade(req.user!.id, req.body);
    res.status(201).json(trade);
  } catch (err) {
    next(err);
  }
}

export async function updateTrade(req: Request, res: Response, next: NextFunction) {
  try {
    const trade = await tradeService.updateTrade(req.user!.id, req.params.id as string, req.body);
    res.status(200).json(trade);
  } catch (err) {
    next(err);
  }
}

export async function deleteTrade(req: Request, res: Response, next: NextFunction) {
  try {
    await tradeService.deleteTrade(req.user!.id, req.params.id as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

import { Request, Response, NextFunction } from "express";
import * as accountService from "../services/accountService";

export async function getAll(req: Request, res: Response, next: NextFunction) {
  try {
    const accounts = await accountService.getAllAccounts(req.user!.id);
    res.status(200).json(accounts);
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const account = await accountService.getAccountById(req.user!.id, req.params.id as string);
    res.status(200).json(account);
  } catch (err) {
    next(err);
  }
}

export async function createAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const account = await accountService.createAccount(req.user!.id, req.body);
    res.status(201).json(account);
  } catch (err) {
    next(err);
  }
}

export async function updateAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const account = await accountService.updateAccount(req.user!.id, req.params.id as string, req.body);
    res.status(200).json(account);
  } catch (err) {
    next(err);
  }
}

export async function deleteAccount(req: Request, res: Response, next: NextFunction) {
  try {
    await accountService.deleteAccount(req.user!.id, req.params.id as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

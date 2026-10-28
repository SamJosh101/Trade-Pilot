import rateLimit from "express-rate-limit";
import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import * as financial from "../financial/service";
import { realizedSummary } from "../financial/queries";
import { etag } from "../financial/revision";
import { parse, instant, UNIT_KEYS } from "../financial/schemas";
import { CALCULATION_VERSION } from "../financial/calculate";
import { z } from "zod";
import { databaseCompatibility } from '../utils/schemaCompatibility';
import { FinancialError } from '../financial/errors';
const router = Router();
router.use(authMiddleware);
router.use(rateLimit({ windowMs: 60000, limit: 60, keyGenerator: req => req.user!.id, standardHeaders: "draft-7", legacyHeaders: false, message: { error: { code: "RATE_LIMITED", message: "Too many financial requests" } } }));
const ctx = (req: Request) => ({ ifMatch: req.headers["if-match"], capability: req.headers["x-tradepilot-capability"] });
const endpoint = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { Promise.resolve(fn(req, res)).catch(next); };
router.get('/capabilities', endpoint(async (_req, res) => { const schema=await databaseCompatibility();res.setHeader('Cache-Control', 'no-store'); res.json({ protocol: 'financial-v1.1', writesEnabled: schema.financial&&financial.writesEnabled(), schemaReady:schema.financial, calculationVersion: CALCULATION_VERSION, settlementUnits: UNIT_KEYS, maxEvents: 10000 }); }));
router.use((req,_res,next)=>{
  databaseCompatibility().then(schema=>{
  if(!schema.financial){
    // Existing edit/detail clients use 404 to fall back to the owned legacy GET.
    const legacyRead=req.method==='GET'&&/^\/trades\/[^/]+(?:\/performance)?$/.test(req.path);
    return next(new FinancialError('FINANCIAL_SCHEMA_UNAVAILABLE','Version 1.1 financial storage is unavailable. Existing journal records remain separate.',legacyRead?404:503));
  }
  next();
  }).catch(next);
});
router.get('/trades/:id', endpoint(async (req, res) => { const r = await financial.getExactTrade(req.user!.id, req.params.id as string); res.setHeader('ETag', etag(r.id, r.revision)); res.json(r); }));
router.get('/trades/:id/performance', endpoint(async (req, res) => { const r = await financial.getPerformance(req.user!.id, req.params.id as string); res.setHeader('ETag', etag(r.tradeId, r.revision)); res.json(r); }));
router.put('/trades/:id/performance', endpoint(async (req, res) => { const r = await financial.replacePerformance(req.user!.id, req.params.id as string, req.body, ctx(req)); res.setHeader('ETag', etag(r.tradeId, r.revision)); res.json(r); }));
router.post('/trades/:id/performance/preview', endpoint(async (req, res) => { res.json(await financial.previewPerformance(req.user!.id, req.params.id as string, req.body, ctx(req))); }));
router.post('/trades', endpoint(async (req, res) => { const r = await financial.createExactTrade(req.user!.id, req.body, ctx(req)); res.setHeader('ETag', etag(r.id, r.revision)); res.status(201).json(financial.planDto(r)); }));
router.patch('/trades/:id', endpoint(async (req, res) => { const r = await financial.updateExactTrade(req.user!.id, req.params.id as string, req.body, ctx(req)); res.setHeader('ETag', etag(r.id, r.revision)); res.json(financial.planDto(r)); }));
router.delete('/trades/:id', endpoint(async (req, res) => { await financial.deleteFinancialTrade(req.user!.id, req.params.id as string, req.body, ctx(req)); res.status(204).send(); }));
router.put('/accounts/:id/denomination', endpoint(async (req, res) => { res.json(await financial.setDenomination(req.user!.id, req.params.id as string, req.body, ctx(req))); }));
router.get('/performance', endpoint(async (req, res) => { const f = parse(z.object({ accountId: z.string().uuid().optional(), from: instant.optional(), to: instant.optional() }).strict(), req.query); res.json(await realizedSummary(req.user!.id, { accountId: f.accountId, from: f.from ? new Date(f.from) : undefined, to: f.to ? new Date(f.to) : undefined })); }));
export default router;

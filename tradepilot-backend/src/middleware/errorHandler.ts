import {GameplanError} from '../gameplans/service';
import {FinancialError} from "../financial/errors";
import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "../utils/AppError";
import {NotesError} from '../notes/errors';

/**
 * The single place in the backend that decides the JSON error shape.
 * Controllers/services never format error responses themselves — they
 * throw AppError (or let unexpected errors bubble up) and call next(err).
 * Must be registered last, after all routes, in app.ts.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  if (typeof err === 'object' && err !== null && 'type' in err) {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large' });
  }
  if(err instanceof GameplanError)return res.status(err.statusCode).json({error:{code:err.code,message:err.message}});
  if (err instanceof FinancialError) return res.status(err.statusCode).json({error:{code:err.code,message:err.message,...(err.details?{details:err.details}:{})}});
  if(err instanceof NotesError)return res.status(err.statusCode).json({error:{code:err.code,message:err.message,...(err.currentRevision!==undefined?{currentRevision:err.currentRevision}:{})}});
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Prisma's own typed errors — translate the common ones instead of
  // letting them fall through as an opaque 500.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2021' || err.code === 'P2022') {
      // Safe diagnostics: never print connection URLs, SQL parameters or rows.
      console.error('Database schema compatibility error',err.code);
      return res.status(503).json({error:'The application database schema is incompatible with this query. No automatic migration or data reset was performed.'});
    }
    if (err.code === "P2002") {
      return res.status(409).json({ error: "A record with that value already exists" });
    }
    if(err.code==='P2003')return res.status(409).json({error:'Record has protected linked data, such as notes or a historical checklist. No records were deleted. Review retention before deleting or reassigning it.'});
    if (err.code === "P2004" || err.code === "P2034") return res.status(409).json({error:"Record conflicts with protected financial data"});
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Record not found" });
    }
  }

  console.error("Unhandled request error",err instanceof Error ? err.name : "UnknownError",err instanceof Prisma.PrismaClientKnownRequestError?err.code:'');
  return res.status(500).json({ error: "Internal server error" });
}

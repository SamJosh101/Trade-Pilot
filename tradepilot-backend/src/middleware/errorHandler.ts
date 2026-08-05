import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { AppError } from "../utils/AppError";

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
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Prisma's own typed errors — translate the common ones instead of
  // letting them fall through as an opaque 500.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "A record with that value already exists" });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Record not found" });
    }
  }

  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}

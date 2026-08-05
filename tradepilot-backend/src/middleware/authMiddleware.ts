import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

/**
 * Runs before any protected controller.
 * - Reads Authorization: Bearer <token>
 * - Verifies signature + expiry
 * - Attaches req.user = { id } so controllers/services can scope
 *   every query to the authenticated user, never a value from the request body.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.split(" ")[1] : null;

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as { userId: string };
    req.user = { id: payload.userId };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

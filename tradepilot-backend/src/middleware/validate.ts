import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

/**
 * Wraps a Zod schema into Express middleware.
 * On success, req.body is replaced with the parsed (typed, coerced) data.
 * On failure, responds 400 with the first validation error message.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message });
    }
    req.body = result.data;
    next();
  };
}

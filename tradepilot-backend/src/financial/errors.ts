import { AppError } from "../utils/AppError";
export class FinancialError extends AppError {
    constructor(public code: string, message: string, status = 422, public details?: Record<string, unknown>) { super(message, status); this.name = "FinancialError"; Object.setPrototypeOf(this, FinancialError.prototype); }
}
export function fail(code: string, message = code, status = 422): never { throw new FinancialError(code, message, status); }

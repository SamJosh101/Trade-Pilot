import { Prisma } from "@prisma/client";
import { fail } from "./errors";
export const Decimal = Prisma.Decimal.clone({ precision: 200, rounding: Prisma.Decimal.ROUND_HALF_UP });
export const dec = (v: Prisma.Decimal.Value) => new Decimal(v);
export function decimalString(value: unknown, p = 38, s = 18, positive = false): string {
    if (typeof value !== "string" || value.length > 128 || !/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(value))
        fail("INVALID_DECIMAL", "Use a finite decimal string without exponent notation");
    const text = value as string;
    const [whole, fraction = ""] = text.replace(/^-/, '').split('.');
    if (whole.replace(/^0+/, '').length > p - s || fraction.length > s)
        fail("DECIMAL_PRECISION", "Decimal exceeds its exact storage bound");
    if (positive && dec(text).lte(0))
        fail("POSITIVE_VALUE_REQUIRED");
    return text;
}
export function canonical(v: Prisma.Decimal): string | null {
    const r = dec(v).toDecimalPlaces(12);
    if (!v.isZero() && r.isZero())
        return null;
    if (r.abs().gte('100000000000000000000000000'))
        return null;
    return r.toFixed(12);
}
export function normalize(raw: string, scale: string): string {
    const v = canonical(dec(raw).div(decimalString(scale, 20, 8, true)));
    if (v === null)
        fail("PRECISION_INSUFFICIENT");
    return v;
}

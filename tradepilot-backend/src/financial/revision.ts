import { FinancialError, fail } from "./errors";
export const CAPABILITY = "financial-v1.1";
export function expectedRevision(id: string, header: unknown, body: unknown): number {
    let h: number | undefined;
    if (header !== undefined) {
        if (typeof header !== "string")
            fail("INVALID_PRECONDITION", "Invalid revision precondition", 400);
        const match = /^"trade:([^":]+):(0|[1-9][0-9]*)"$/.exec(header as string);
        if (!match || match[1] !== id)
            fail("INVALID_PRECONDITION", "Invalid revision precondition", 400);
        h = Number(match![2]);
    }
    if (body !== undefined && (!Number.isSafeInteger(body) || (body as number) < 0 || (body as number) > 2147483646))
        fail("INVALID_PRECONDITION", "Invalid revision precondition", 400);
    if (h !== undefined && (!Number.isSafeInteger(h) || h > 2147483646))
        fail("INVALID_PRECONDITION", "Invalid revision precondition", 400);
    if (h !== undefined && body !== undefined && h !== body)
        fail("INVALID_PRECONDITION", "Revision preconditions disagree", 400);
    const result = h ?? body;
    if (result === undefined)
        fail("PRECONDITION_REQUIRED", "Revision precondition required", 428);
    return result as number;
}
export function compareRevision(expected: number, current: number) {
    if (expected !== current)
        throw new FinancialError("REVISION_CONFLICT", "This trade changed elsewhere", 409, { currentRevision: current, reload: true });
}
export const etag = (id: string, revision: number) => `"trade:${id}:${revision}"`;

import {z} from 'zod';
export const newPassword=z.string().min(12,'Use at least 12 characters').refine(v=>Buffer.byteLength(v,'utf8')<=72,'Password must not exceed72 UTF-8 bytes');
export const passwordChange=z.object({currentPassword:z.string().min(1).max(1024),newPassword,revokeAllSessions:z.literal(true)}).strict();
export const confirmation=z.object({currentPassword:z.string().min(1).max(1024),confirmed:z.literal(true)}).strict();

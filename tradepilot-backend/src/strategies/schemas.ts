import {z} from 'zod';
const text=(max:number)=>z.string().max(max).refine(v=>!v.includes('\0'),'Unsupported null character');
export const strategyInput=z.object({name:text(160).transform(v=>v.trim()).refine(v=>!!v,'A name is required'),description:text(5000)}).strict();
export const strategyQuery=z.object({q:text(200).optional(),state:z.enum(['active','archived','all']).default('active'),sort:z.enum(['updated','name']).default('updated'),limit:z.coerce.number().int().min(1).max(50).default(20),cursor:z.string().max(2048).optional()}).strict();
export const assignmentInput=z.object({strategyId:z.string().uuid().nullable(),strategyRevision:z.number().int().min(0).max(2147483646).nullable()}).strict().refine(v=>(v.strategyId===null)===(v.strategyRevision===null),'Choose a saved strategy revision or explicitly unassign');
export const historyQuery=z.object({limit:z.coerce.number().int().min(1).max(50).default(20),cursor:z.string().max(2048).optional()}).strict();
export const tradeQuery=historyQuery.extend({accountId:z.string().uuid(),strategyId:z.union([z.string().uuid(),z.literal('unassigned')]),q:text(100).optional(),sort:z.enum(['newest','oldest']).default('newest')}).strict();
export type StrategyInput=z.infer<typeof strategyInput>;

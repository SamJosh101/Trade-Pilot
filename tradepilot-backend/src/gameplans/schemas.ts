import {z} from 'zod';
const text=(max:number)=>z.string().max(max).refine(v=>!v.includes('\0'),'Unsupported null character');
export const item=z.object({id:z.string().uuid(),label:text(500).transform(v=>v.trim()).refine(v=>v.length>0,'A rule needs text'),required:z.boolean()}).strict();
export const planInput=z.object({name:text(160).transform(v=>v.trim()).refine(v=>!!v,'A name is required'),description:text(5000),items:z.array(item).min(1).max(100).refine(v=>new Set(v.map(i=>i.id)).size===v.length,'Repeated rule IDs')}).strict();
export const planQuery=z.object({q:text(200).optional(),state:z.enum(['active','archived','all']).default('active'),sort:z.enum(['updated','name']).default('updated'),limit:z.coerce.number().int().min(1).max(50).default(20),cursor:z.string().max(2048).optional()}).strict();
export const attachInput=z.object({templateId:z.string().uuid(),templateRevision:z.number().int().min(0).max(2147483646)}).strict();
export const answersInput=z.object({answers:z.record(z.string().uuid(),z.boolean())}).strict();
export const duplicateInput=z.object({name:planInput.shape.name}).strict();
export type PlanInput=z.infer<typeof planInput>;

import {Prisma} from '@prisma/client';
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import prisma from '../config/prisma';
import {env} from '../config/env';
import {withUserLock} from '../utils/withUserLock';
import {NotesError} from './errors';
import type {NoteInput,NotePatch,NoteQuery} from './schemas';

export const etag=(kind:'note'|'folder',id:string,revision:number)=>`"${kind}:${id}:${revision}"`;
export function revision(kind:'note'|'folder',id:string,header:unknown){
 if(typeof header!=='string')throw new NotesError('PRECONDITION_REQUIRED','Inspect the saved revision before changing this record',428);
 const match=header.match(/^"(note|folder):([a-f0-9-]{36}):(0|[1-9][0-9]{0,9})"$/);
 if(!match||match[1]!==kind||match[2]!==id||Number(match[3])>2147483646)throw new NotesError('INVALID_PRECONDITION','Invalid record revision',400);
 return Number(match[3]);
}
function conflict(current:number){throw new NotesError('REVISION_CONFLICT','This record changed elsewhere. Your draft has not been saved. Inspect the latest version before retrying.',409,current);}
export async function available(){
 const expected:Record<string,string[]>={Note:['id','userId','folderId','accountId','tradeId','dayDate','title','body','revision','createdAt','updatedAt'],NoteFolder:['id','userId','name','revision','createdAt','updatedAt'],NoteImportReceipt:['id','userId','key','fingerprint','referenceNoteId','createdAt']};
 const columns=await prisma.$queryRaw<Array<{table_name:string;column_name:string}>>`SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('Note','NoteFolder','NoteImportReceipt')`;
 if(!Object.entries(expected).every(([table,fields])=>fields.every(field=>columns.some(c=>c.table_name===table&&c.column_name===field))))return false;
 const constraints=await prisma.$queryRaw<Array<{conname:string}>>`SELECT conname FROM pg_constraint WHERE connamespace='public'::regnamespace AND conname IN ('Note_userId_fkey','Note_folderId_userId_fkey','Note_accountId_userId_fkey','Note_tradeId_accountId_fkey','NoteFolder_userId_fkey','NoteImportReceipt_userId_fkey','Note_associations_valid','Note_revision_nonnegative','NoteFolder_revision_nonnegative')`;
 return constraints.length===9;
}
const projection={id:true,userId:true,title:true,body:true,folderId:true,accountId:true,tradeId:true,dayDate:true,revision:true,createdAt:true,updatedAt:true} as const;
function publicNote<T extends {userId:string}>(value:T){const {userId:_,...record}=value;return record;}
export async function getNote(userId:string,id:string){const n=await prisma.note.findFirst({where:{id,userId},select:projection});if(!n)throw new NotesError('NOT_FOUND','Note not found',404);return publicNote(n);}
async function associations(tx:Prisma.TransactionClient,userId:string,input:NoteInput){
 if(input.folderId&&!await tx.noteFolder.findFirst({where:{id:input.folderId,userId},select:{id:true}}))throw new NotesError('NOT_FOUND','Folder not found',404);
 if(input.accountId&&!await tx.tradingAccount.findFirst({where:{id:input.accountId,userId},select:{id:true}}))throw new NotesError('NOT_FOUND','Account not found',404);
 if(input.tradeId){const trade=await tx.trade.findFirst({where:{id:input.tradeId,userId},select:{id:true,accountId:true}});if(!trade)throw new NotesError('NOT_FOUND','Trade not found',404);if(input.accountId!==trade.accountId)throw new NotesError('ASSOCIATION_MISMATCH','Select the linked trade\'s trading account',422);}
 if(input.dayDate&&!input.accountId)throw new NotesError('ACCOUNT_REQUIRED','Daily notes require a trading account',422);
}
export function createNote(userId:string,input:NoteInput,requestKey?:string){
 if(requestKey&&!/^[a-f0-9-]{36}$/.test(requestKey))throw new NotesError('INVALID_IDEMPOTENCY_KEY','Invalid creation request key');
 return withUserLock(userId,async tx=>requestKey?(await createOnce(tx,userId,input,`create:${requestKey}`)).note:publicNote(await (async()=>{await associations(tx,userId,input);return tx.note.create({data:{...input,userId},select:projection});})()));
}
export function updateNote(userId:string,id:string,input:NotePatch,header:unknown){return withUserLock(userId,async tx=>{
 const current=await tx.note.findFirst({where:{id,userId},select:projection});if(!current)throw new NotesError('NOT_FOUND','Note not found',404);
 if(revision('note',id,header)!==current.revision)conflict(current.revision);
 await associations(tx,userId,{...current,...input});
 return publicNote(await tx.note.update({where:{id},data:{...input,revision:{increment:1}},select:projection}));
});}
export function deleteNote(userId:string,id:string,header:unknown){return withUserLock(userId,async tx=>{const n=await tx.note.findFirst({where:{id,userId},select:{revision:true}});if(!n)throw new NotesError('NOT_FOUND','Note not found',404);if(revision('note',id,header)!==n.revision)conflict(n.revision);await tx.note.delete({where:{id}});});}

const signature=(data:string)=>createHmac('sha256',env.jwtSecret).update(`notes-cursor-v1:${data}`).digest('base64url');
function encodeCursor(scope:string,id:string,value:string){const data=Buffer.from(JSON.stringify({v:1,scope,id,value})).toString('base64url');return `${data}.${signature(data)}`;}
function decodeCursor(cursor:string|undefined,scope:string):{id:string;value:string}|null{
 if(!cursor)return null;
 try{const [data,mac,...extra]=cursor.split('.');if(extra.length||!data||!mac)throw Error();const expected=signature(data);if(mac.length!==expected.length||!timingSafeEqual(Buffer.from(mac),Buffer.from(expected)))throw Error();const p=JSON.parse(Buffer.from(data,'base64url').toString());if(p.v!==1||p.scope!==scope||typeof p.id!=='string'||typeof p.value!=='string')throw Error();return p;}catch{throw new NotesError('INVALID_CURSOR','The list changed or the cursor does not belong to this query. Refresh the list.',400);}
}
export async function listNotes(userId:string,query:NoteQuery){
 if(query.accountId&&!await prisma.tradingAccount.findFirst({where:{id:query.accountId,userId},select:{id:true}}))throw new NotesError('NOT_FOUND','Account not found',404);
 if(query.folderId&&query.folderId!=='unfiled'&&!await prisma.noteFolder.findFirst({where:{id:query.folderId,userId},select:{id:true}}))throw new NotesError('NOT_FOUND','Folder not found',404);
 if(query.tradeId&&!await prisma.trade.findFirst({where:{id:query.tradeId,userId},select:{id:true}}))throw new NotesError('NOT_FOUND','Trade not found',404);
 const {cursor,limit,...filter}=query,scope=JSON.stringify([userId,filter]);const after=decodeCursor(cursor,scope);
 const field=query.sort==='title_asc'?'title':query.sort==='created_desc'?'createdAt':'updatedAt';const direction=query.sort.endsWith('asc')?'asc':'desc';
 const where:Prisma.NoteWhereInput={userId,...(query.accountId?{accountId:query.accountId}:{}),...(query.tradeId?{tradeId:query.tradeId}:{}),...(query.dayDate?{dayDate:query.dayDate}:{}),...(query.folderId?{folderId:query.folderId==='unfiled'?null:query.folderId}:{}),...(query.q?{OR:[{title:{contains:query.q,mode:'insensitive'}},{body:{contains:query.q,mode:'insensitive'}}]}:{})};
 if(after){const value=field==='title'?after.value:new Date(after.value);if(value instanceof Date&&!Number.isFinite(value.getTime()))throw new NotesError('INVALID_CURSOR','Invalid list cursor');where.AND=[{OR:[{[field]:{[direction==='asc'?'gt':'lt']:value}},{[field]:value,id:{[direction==='asc'?'gt':'lt']:after.id}}]}];}
 const rows=await prisma.note.findMany({where,orderBy:[{[field]:direction},{id:direction}],take:limit+1,select:projection});const hasMore=rows.length>limit;const items=rows.slice(0,limit),last=items[items.length-1];
 return {items:items.map(n=>{const {body,...summary}=publicNote(n);return {...summary,excerpt:body.slice(0,200)};}),nextCursor:hasMore&&last?encodeCursor(scope,last.id,field==='title'?last.title:last[field].toISOString()):null};
}
export async function listFolders(userId:string,query:{limit:number;cursor?:string}){const scope=JSON.stringify([userId,'folders']),after=decodeCursor(query.cursor,scope);const rows=await prisma.noteFolder.findMany({where:{userId,...(after?{OR:[{name:{gt:after.value}},{name:after.value,id:{gt:after.id}}]}:{})},orderBy:[{name:'asc'},{id:'asc'}],take:query.limit+1,include:{_count:{select:{notes:true}}}});const items=rows.slice(0,query.limit),last=items[items.length-1];return {items:items.map(publicNote),nextCursor:rows.length>query.limit&&last?encodeCursor(scope,last.id,last.name):null};}
export function createFolder(userId:string,input:{name:string}){return withUserLock(userId,async tx=>publicNote(await tx.noteFolder.create({data:{...input,userId},include:{_count:{select:{notes:true}}}})));}
export function updateFolder(userId:string,id:string,input:{name:string},header:unknown){return withUserLock(userId,async tx=>{const f=await tx.noteFolder.findFirst({where:{id,userId}});if(!f)throw new NotesError('NOT_FOUND','Folder not found',404);if(revision('folder',id,header)!==f.revision)conflict(f.revision);return publicNote(await tx.noteFolder.update({where:{id},data:{...input,revision:{increment:1}},include:{_count:{select:{notes:true}}}}));});}
export function deleteFolder(userId:string,id:string,header:unknown){return withUserLock(userId,async tx=>{const f=await tx.noteFolder.findFirst({where:{id,userId}});if(!f)throw new NotesError('NOT_FOUND','Folder not found',404);if(revision('folder',id,header)!==f.revision)conflict(f.revision);if(await tx.note.count({where:{folderId:id,userId}}))throw new NotesError('FOLDER_NOT_EMPTY','Move or delete all notes before deleting this folder',409);await tx.noteFolder.delete({where:{id}});});}
async function createOnce(tx:Prisma.TransactionClient,userId:string,note:NoteInput,key:string){
 const normalized={title:note.title,body:note.body,accountId:note.accountId??null,dayDate:note.dayDate??null,folderId:note.folderId??null,tradeId:note.tradeId??null};const fingerprint=createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
 const existing=await tx.noteImportReceipt.findUnique({where:{userId_key:{userId,key}}});
 if(existing){if(existing.fingerprint!==fingerprint)throw new NotesError('IDEMPOTENCY_CONFLICT','This request key was already used for different content. Inspect the saved note before creating another.',409);const saved=await tx.note.findFirst({where:{id:existing.referenceNoteId,userId},select:projection});if(!saved)throw new NotesError('IMPORTED_NOTE_DELETED','This request completed previously and its note was later deleted. It will not be recreated by a retry.',410);return {note:publicNote(saved),replayed:true};}
 await associations(tx,userId,normalized);const created=await tx.note.create({data:{...normalized,userId},select:projection});await tx.noteImportReceipt.create({data:{userId,key,fingerprint,referenceNoteId:created.id}});return {note:publicNote(created),replayed:false};
}
export function importLocal(userId:string,input:NoteInput&{key:string;accountId:string;dayDate:string}){const {key,...note}=input;return withUserLock(userId,tx=>createOnce(tx,userId,note,`import:${createHash('sha256').update(key).digest('hex')}`));}
export async function getFolder(userId:string,id:string){const folder=await prisma.noteFolder.findFirst({where:{id,userId},include:{_count:{select:{notes:true}}}});if(!folder)throw new NotesError('NOT_FOUND','Folder not found',404);return publicNote(folder);}

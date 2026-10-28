import {Router,type Request,type Response,type NextFunction} from 'express';
import rateLimit from 'express-rate-limit';
import {authMiddleware} from '../middleware/authMiddleware';
import {validate} from '../middleware/validate';
import * as notes from '../notes/service';
import {NotesError} from '../notes/errors';
import {noteInput,notePatch,noteQuery,folderInput,folderQuery,importInput} from '../notes/schemas';
export const notesRouter=Router(),foldersRouter=Router();
const run=(fn:(req:Request,res:Response)=>Promise<unknown>)=>(req:Request,res:Response,next:NextFunction)=>{Promise.resolve(fn(req,res)).catch(next);};
const ready=run(async(_req,res)=>{res.setHeader('Cache-Control','no-store');res.json({protocol:'notes-v1',available:await notes.available(),localNotesPreserved:true});});
const gate=(_req:Request,_res:Response,next:NextFunction)=>{notes.available().then(available=>available?next():next(new NotesError('NOTES_SCHEMA_UNAVAILABLE','Persistent Notes requires a separately approved compatible database upgrade. Browser notes have been preserved.',503))).catch(next);};
for(const router of [notesRouter,foldersRouter]){
 router.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
 router.use(authMiddleware);
 router.use(rateLimit({windowMs:60000,limit:180,keyGenerator:req=>req.user!.id,standardHeaders:'draft-7',legacyHeaders:false,message:{error:{code:'NOTES_RATE_LIMITED',message:'Too many Notes requests. Wait and retry.'}}}));
}
notesRouter.get('/capabilities',ready);
notesRouter.use(gate);foldersRouter.use(gate);
notesRouter.get('/',run(async(req,res)=>{const q=noteQuery.safeParse(req.query);if(!q.success)throw new NotesError('INVALID_QUERY',q.error.issues[0].message);res.setHeader('Cache-Control','no-store');res.json(await notes.listNotes(req.user!.id,q.data));}));
notesRouter.post('/import/local',validate(importInput),run(async(req,res)=>{const r=await notes.importLocal(req.user!.id,req.body);res.setHeader('ETag',notes.etag('note',r.note.id,r.note.revision));res.status(r.replayed?200:201).json(r);}));
notesRouter.post('/',validate(noteInput),run(async(req,res)=>{const n=await notes.createNote(req.user!.id,req.body,typeof req.headers['idempotency-key']==='string'?req.headers['idempotency-key']:undefined);res.setHeader('ETag',notes.etag('note',n.id,n.revision));res.status(201).json(n);}));
notesRouter.get('/:id',run(async(req,res)=>{const n=await notes.getNote(req.user!.id,req.params.id as string);res.setHeader('Cache-Control','no-store');res.setHeader('ETag',notes.etag('note',n.id,n.revision));res.json(n);}));
notesRouter.patch('/:id',validate(notePatch),run(async(req,res)=>{const n=await notes.updateNote(req.user!.id,req.params.id as string,req.body,req.headers['if-match']);res.setHeader('ETag',notes.etag('note',n.id,n.revision));res.json(n);}));
notesRouter.delete('/:id',run(async(req,res)=>{await notes.deleteNote(req.user!.id,req.params.id as string,req.headers['if-match']);res.sendStatus(204);}));
foldersRouter.get('/',run(async(req,res)=>{const q=folderQuery.safeParse(req.query);if(!q.success)throw new NotesError('INVALID_QUERY',q.error.issues[0].message);res.setHeader('Cache-Control','no-store');res.json(await notes.listFolders(req.user!.id,q.data));}));
foldersRouter.post('/',validate(folderInput),run(async(req,res)=>{const f=await notes.createFolder(req.user!.id,req.body);res.setHeader('ETag',notes.etag('folder',f.id,f.revision));res.status(201).json(f);}));
foldersRouter.get('/:id',run(async(req,res)=>{const f=await notes.getFolder(req.user!.id,req.params.id as string);res.setHeader('Cache-Control','no-store');res.setHeader('ETag',notes.etag('folder',f.id,f.revision));res.json(f);}));
foldersRouter.patch('/:id',validate(folderInput),run(async(req,res)=>{const f=await notes.updateFolder(req.user!.id,req.params.id as string,req.body,req.headers['if-match']);res.setHeader('ETag',notes.etag('folder',f.id,f.revision));res.json(f);}));
foldersRouter.delete('/:id',run(async(req,res)=>{await notes.deleteFolder(req.user!.id,req.params.id as string,req.headers['if-match']);res.sendStatus(204);}));

import axios from 'axios';
import api from '../api/apiClient';
export type NoteInput={title:string;body:string;folderId:string|null;accountId:string|null;tradeId:string|null;dayDate:string|null};
export type Note=NoteInput&{id:string;revision:number;createdAt:string;updatedAt:string};
export type NoteSummary=Omit<Note,'body'>&{excerpt:string};
export type Folder={id:string;name:string;revision:number;createdAt:string;updatedAt:string;_count:{notes:number}};
export type NoteQuery={q?:string;accountId?:string;tradeId?:string;folderId?:string;dayDate?:string;sort?:string;cursor?:string;limit?:number};
export type Page<T>={items:T[];nextCursor:string|null};
export const capabilities=async(signal?:AbortSignal)=>(await api.get<{protocol:'notes-v1';available:boolean;localNotesPreserved:boolean}>('/notes/capabilities',{signal})).data;
export const list=async(query:NoteQuery,signal?:AbortSignal)=>(await api.get<Page<NoteSummary>>('/notes',{params:query,signal})).data;
export const get=async(id:string)=>(await api.get<Note>(`/notes/${id}`)).data;
const match=(type:'note'|'folder',id:string,revision:number)=>({'If-Match':`"${type}:${id}:${revision}"`});
export const create=async(input:NoteInput,key:string)=>(await api.post<Note>('/notes',input,{headers:{'Idempotency-Key':key}})).data;
export const update=async(id:string,revision:number,input:NoteInput)=>(await api.patch<Note>(`/notes/${id}`,input,{headers:match('note',id,revision)})).data;
export const remove=async(id:string,revision:number)=>{await api.delete(`/notes/${id}`,{headers:match('note',id,revision)});};
export const folders=async(cursor?:string,signal?:AbortSignal)=>(await api.get<Page<Folder>>('/note-folders',{params:{cursor},signal})).data;
export const folder=async(id:string)=>(await api.get<Folder>(`/note-folders/${id}`)).data;
export const createFolder=async(name:string)=>(await api.post<Folder>('/note-folders',{name})).data;
export const renameFolder=async(f:Folder,name:string)=>(await api.patch<Folder>(`/note-folders/${f.id}`,{name},{headers:match('folder',f.id,f.revision)})).data;
export const removeFolder=async(f:Folder)=>{await api.delete(`/note-folders/${f.id}`,{headers:match('folder',f.id,f.revision)});};
export const importLocal=async(input:NoteInput&{accountId:string;dayDate:string;key:string})=>(await api.post<{note:Note;replayed:boolean}>('/notes/import/local',input)).data;
export function errorMessage(error:unknown){
 if(axios.isAxiosError(error)){if(!error.response)return 'Connection interrupted. Your draft is still here. A save may have committed; inspect the saved version before starting another note.';const e=error.response.data?.error;return typeof e==='string'?e:e?.message??'Notes request failed. Retry when the connection is available.';}
 return error instanceof Error?error.message:'Notes request failed';
}
export const status=(error:unknown)=>axios.isAxiosError(error)?error.response?.status:undefined;

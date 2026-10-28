import { AppError } from '../utils/AppError';
export class NotesError extends AppError {
  constructor(public code:string,message:string,status=400,public currentRevision?:number){super(message,status);Object.setPrototypeOf(this,NotesError.prototype);}
}

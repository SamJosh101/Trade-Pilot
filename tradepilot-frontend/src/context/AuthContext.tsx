import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import axios from 'axios'
import * as authService from '../services/authService'
import type { User } from '../types/auth'

type AuthContextValue = {
  user: User | null
  token: string | null
  isLoading: boolean
  sessionError: string
  retrySession: () => void
  updateProfile: (input: {name:string;email:string;currentPassword?:string}) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
)

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionError,setSessionError]=useState('')
  const [attempt,setAttempt]=useState(0)

  useEffect(() => {
    let current=true;
    const savedToken=localStorage.getItem('token');
    setSessionError('');setIsLoading(true);
    if(!savedToken){setToken(null);setUser(null);setIsLoading(false);return;}
    setToken(savedToken);
    authService.getMe().then(currentUser=>{if(current&&localStorage.getItem('token')===savedToken)setUser(currentUser);}).catch(error=>{
      if(!current)return;
      if(axios.isAxiosError(error)&&[401,404].includes(error.response?.status??0)){
        if(localStorage.getItem('token')===savedToken){localStorage.removeItem('token');setToken(null);setUser(null);}
      }else setSessionError('Your session could not be checked. Your sign-in has been kept. Check your connection and retry.');
    }).finally(()=>{if(current)setIsLoading(false);});
    return()=>{current=false;};
  },[attempt]);
  useEffect(()=>{
    const expired=()=>{setToken(null);setUser(null);setSessionError('');};
    window.addEventListener('tradepilot:session-expired',expired);
    const storage=(event:StorageEvent)=>{if(event.key==='token')setAttempt(v=>v+1);};
    window.addEventListener('storage',storage);
    return()=>{window.removeEventListener('tradepilot:session-expired',expired);window.removeEventListener('storage',storage);};
  },[]);
  const retrySession=useCallback(()=>setAttempt(v=>v+1),[]);
  const updateProfile=useCallback(async(input:{name:string;email:string;currentPassword?:string})=>{
    const scope=localStorage.getItem('token');const updated=await authService.updateProfile(input);
    if(scope&&scope===localStorage.getItem('token'))setUser(updated);
  },[]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authService.login(email, password)

    localStorage.setItem('token', response.token)
    setSessionError('')
    setToken(response.token)
    setUser(response.user)
  }, [])

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      await authService.register(name, email, password)
      try { await login(email, password) }
      catch {
        const error=new Error('Your account was created, but automatic sign-in failed. Retry sign-in using this form.');
        error.name='RegistrationSignInError';throw error;
      }
    },
    [login],
  )

  const logout = useCallback(() => {
    const saved=localStorage.getItem('token');
    if(saved)void authService.revokeCurrentSession(saved).catch(()=>{/* Offline/legacy sign-out clears this browser only; server revocation is not claimed. */});
    localStorage.removeItem('token')
    setSessionError('')
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      sessionError, retrySession, updateProfile,
      login,
      register,
      logout,
    }),
    [user, token, isLoading, sessionError, retrySession, updateProfile, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

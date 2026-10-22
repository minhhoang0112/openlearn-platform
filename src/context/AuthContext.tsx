import React, {createContext, useContext, useEffect, useState, useRef} from 'react';
import {api, ApiError, UserProfile} from '../api/client';
interface AuthContextType {
  user: UserProfile | null; loading: boolean; error: string | null;
  capabilities: Awaited<ReturnType<typeof api.capabilities>> | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>; refreshUser: () => Promise<void>;
  refreshCapabilities: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | null>(null);
export const AuthProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [user,setUser] = useState<UserProfile | null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState<string | null>(null);
  const authVersion=useRef(0);
  const [capabilities,setCapabilities] = useState<AuthContextType['capabilities']>(null);
  const refreshCapabilities = async () => {setCapabilities(await api.capabilities());};
  const refreshUser = async () => {
    const version=++authVersion.current;
    setError(null);
    try { const current=await api.me();if(version===authVersion.current)setUser(current); }
    catch (e) {
      if(version===authVersion.current){setUser(null);if (!(e instanceof ApiError && e.status === 401)) setError(e instanceof Error ? e.message : 'Không thể kết nối máy chủ.');}
    } finally { if(version===authVersion.current)setLoading(false); }
  };
  useEffect(() => {
    void refreshUser();
  },[]);
  useEffect(()=>{void refreshCapabilities().catch(()=>{});},[user?.id]);
  const login = async (email:string,password:string) => {++authVersion.current;setUser(await api.login(email,password));setError(null);setLoading(false);};
  const register = async (email:string,password:string,name:string) => {++authVersion.current;setUser(await api.register(email,password,name));setError(null);setLoading(false);};
  const logout = async () => {++authVersion.current;await api.logout();setUser(null);};
  return <AuthContext.Provider value={{user,loading,error,capabilities,login,register,logout,refreshUser,refreshCapabilities}}>{children}</AuthContext.Provider>;
};
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider is required');
  return context;
}

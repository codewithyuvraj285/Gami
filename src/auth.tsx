import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from './lib/supabase'
const Ctx = createContext<any>(null)
export const useAuth = () => useContext(Ctx)
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<any>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  async function load(s: any) {
    setSession(s)
    if (!s) { setRole(null); setLoading(false); return }
    const { data } = await supabase.from('admin_users').select('role').eq('user_id', s.user.id).maybeSingle()
    setRole(data?.role ?? null); setLoading(false)
  }
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => load(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setTimeout(() => load(s), 0) })
    return () => sub.subscription.unsubscribe()
  }, [])
  return <Ctx.Provider value={{ session, role, loading, signIn: (email: string, password: string) => supabase.auth.signInWithPassword({ email, password }), signOut: () => supabase.auth.signOut() }}>{children}</Ctx.Provider>
}

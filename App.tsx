import { useEffect, useState, FormEvent } from 'react'
import { NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { LayoutDashboard, Package, Boxes, ShoppingBag, MessagesSquare, Users, Truck, Tag, Image, BarChart3, Settings as Cog, Layers, LogOut, Menu } from 'lucide-react'
import { useAuth } from './auth'
import { configured } from './lib/supabase'
import { onToast } from './lib/utils'
import { Spinner } from './components/ui'
import Dashboard from './pages/Dashboard'
import Products from './pages/Products'
import Inventory from './pages/Inventory'
import Orders from './pages/Orders'
import Leads from './pages/Leads'
import Customers from './pages/Customers'
import Delivery from './pages/Delivery'
import { Categories, Coupons } from './pages/Simple'
import Content from './pages/Content'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

const NAV: [string, string, any][] = [
  ['/', 'Dashboard', LayoutDashboard], ['/orders', 'Orders', ShoppingBag], ['/delivery', 'Delivery', Truck], ['/leads', 'Leads & inquiries', MessagesSquare],
  ['/customers', 'Customers', Users], ['/products', 'Products', Package], ['/categories', 'Categories', Layers], ['/inventory', 'Inventory', Boxes],
  ['/coupons', 'Coupons', Tag], ['/content', 'Website content', Image], ['/reports', 'Reports', BarChart3], ['/settings', 'Settings', Cog]
]

function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState(''); const [pw, setPw] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setErr('')
    const { error } = await signIn(email, pw)
    setBusy(false); if (error) setErr(error.message)
  }
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <div><div className="text-lg font-semibold tracking-wide">PARQH Admin</div><p className="text-sm text-muted">Sign in with your administrator account.</p></div>
        {!configured && <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">Supabase keys are missing. Copy <code>.env.example</code> to <code>.env</code> and fill in the project URL and anon key.</div>}
        <input className="input" type="email" required placeholder="Email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="input" type="password" required placeholder="Password" autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} />
        {err && <p className="text-sm text-red-700">{err}</p>}
        <button className="btn-primary w-full" disabled={busy || !configured}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  )
}

function Shell() {
  const { session, role, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [toasts, setToasts] = useState<{ id: number; m: string; t: string }[]>([])
  useEffect(() => { onToast((m, t) => { const id = Date.now() + Math.random(); setToasts(x => [...x, { id, m, t }]); setTimeout(() => setToasts(x => x.filter(i => i.id !== id)), 4000) }) }, [])
  return (
    <div className="min-h-screen lg:flex">
      <aside className={`${open ? 'block' : 'hidden'} fixed inset-y-0 left-0 z-40 w-60 overflow-y-auto bg-ink p-3 text-white lg:static lg:block`}>
        <div className="px-3 pb-4 pt-2 text-lg font-semibold tracking-wide">PARQH <span className="text-xs font-normal text-white/50">admin</span></div>
        <nav className="space-y-0.5">
          {NAV.map(([to, l, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm ${isActive ? 'bg-white/15 font-medium' : 'text-white/75 hover:bg-white/10'}`}><Icon size={17} />{l}</NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white px-4 py-2.5">
          <button className="btn-ghost lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu"><Menu size={20} /></button>
          <div className="ml-auto flex items-center gap-3 text-sm"><span className="hidden text-muted sm:inline">{session.user.email} · {role}</span><button className="btn" onClick={signOut}><LogOut size={15} />Sign out</button></div>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6"><Outlet /></main>
      </div>
      <div className="fixed bottom-4 right-4 z-[60] space-y-2" aria-live="polite">
        {toasts.map(x => <div key={x.id} className={`rounded-md px-4 py-2 text-sm text-white shadow-lg ${x.t === 'err' ? 'bg-red-700' : 'bg-ink'}`}>{x.m}</div>)}
      </div>
    </div>
  )
}

export default function App() {
  const { session, role, loading, signOut } = useAuth()
  if (loading) return <Spinner />
  if (!session) return <Login />
  if (!role) return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="card max-w-sm space-y-3 p-6"><div className="font-semibold">No admin access</div><p className="text-sm text-muted">{session.user.email} is signed in but is not on the administrator list. Ask the store owner to add you.</p><button className="btn" onClick={signOut}>Sign out</button></div>
    </div>
  )
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="delivery" element={<Delivery />} />
        <Route path="leads" element={<Leads />} />
        <Route path="customers" element={<Customers />} />
        <Route path="products" element={<Products />} />
        <Route path="categories" element={<Categories />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="coupons" element={<Coupons />} />
        <Route path="content" element={<Content />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

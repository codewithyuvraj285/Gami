import { ReactNode } from 'react'
import { X, Loader2 } from 'lucide-react'

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-3 sm:p-8" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`w-full ${wide ? 'max-w-4xl' : 'max-w-xl'} rounded-lg bg-white shadow-xl`} role="dialog" aria-label={title}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <button className="btn-ghost" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
export const Field = ({ label, hint, children, className = '' }: any) => (
  <label className={`block ${className}`}>
    <span className="mb-1 block text-xs font-medium text-muted">{label}</span>{children}
    {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
  </label>
)
export const Spinner = () => <div className="flex justify-center p-10 text-muted"><Loader2 className="animate-spin" /></div>
export const ErrorBox = ({ msg }: { msg: string }) => <div className="m-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{msg}</div>
export const Empty = ({ text }: { text: string }) => <div className="p-10 text-center text-sm text-muted">{text}</div>
export const PageHeader = ({ title, sub, children }: any) => (
  <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
    <div><h1>{title}</h1>{sub && <p className="text-sm text-muted">{sub}</p>}</div>
    <div className="flex flex-wrap items-center gap-2">{children}</div>
  </div>
)
const GREEN = ['delivered', 'paid', 'published', 'converted', 'active', 'ok']
const RED = ['cancelled', 'returned', 'failed', 'out', 'not_interested', 'refunded', 'inactive']
const AMBER = ['pending', 'new', 'draft', 'low', 'follow_up', 'partially_refunded']
export function Badge({ v, text }: { v: string; text?: string }) {
  const c = GREEN.includes(v) ? 'bg-green-50 text-green-800' : RED.includes(v) ? 'bg-red-50 text-red-800' : AMBER.includes(v) ? 'bg-amber-50 text-amber-800' : 'bg-indigo-50 text-indigo-800'
  return <span className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${c}`}>{text ?? v.replace(/_/g, ' ')}</span>
}
export const Stat = ({ label, value, tone }: { label: string; value: any; tone?: string }) => (
  <div className="card p-4"><div className="text-xs text-muted">{label}</div><div className={`mt-1 text-2xl font-semibold ${tone || ''}`}>{value}</div></div>
)
export const Tabs = ({ tabs, value, onChange }: { tabs: [string, string][]; value: string; onChange: (v: string) => void }) => (
  <div className="mb-3 flex gap-1 border-b border-line">
    {tabs.map(([k, l]) => (
      <button key={k} onClick={() => onChange(k)} className={`-mb-px border-b-2 px-3 py-2 text-sm ${value === k ? 'border-wine font-medium text-wine' : 'border-transparent text-muted hover:text-ink'}`}>{l}</button>
    ))}
  </div>
)

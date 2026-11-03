import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import SettingsForm from '../components/SettingsForm'
import { Field, PageHeader, Spinner, ErrorBox } from '../components/ui'
import { supabase } from '../lib/supabase'
import { useQuery, must } from '../lib/hooks'
import { toast, fdate } from '../lib/utils'
import { useAuth } from '../auth'

function Admins() {
  const { role, session } = useAuth()
  const { data, loading, error, reload } = useQuery(async () => must(await supabase.from('admin_users').select('*').order('created_at')), [])
  const [email, setEmail] = useState(''); const [r, setR] = useState('admin')
  const owner = role === 'owner'
  async function add() {
    const { error } = await supabase.rpc('add_admin_by_email', { p_email: email, p_role: r })
    if (error) return toast(error.message, 'err')
    toast('Administrator added'); setEmail(''); reload()
  }
  async function setRole(id: string, role: string) { const { error } = await supabase.from('admin_users').update({ role }).eq('user_id', id); error ? toast(error.message, 'err') : (toast('Role updated'), reload()) }
  async function remove(id: string) { if (!confirm('Remove this administrator?')) return; const { error } = await supabase.from('admin_users').delete().eq('user_id', id); error ? toast(error.message, 'err') : (toast('Removed'), reload()) }
  return (
    <div className="card p-5">
      <h2 className="mb-1 font-semibold">Administrators</h2>
      <p className="mb-3 text-sm text-muted">Create the person's login in Supabase → Authentication first, then add their email here. Only owners can change this list.</p>
      {loading ? <Spinner /> : error ? <ErrorBox msg={error} /> : (
        <table className="mb-4 w-full"><tbody className="divide-y divide-line">
          {data!.map((a: any) => (
            <tr key={a.user_id}><td className="td">{a.email}</td><td className="td">{owner && a.user_id !== session.user.id ? <select className="input w-32" value={a.role} onChange={e => setRole(a.user_id, e.target.value)}><option>owner</option><option>admin</option><option>staff</option></select> : a.role}</td><td className="td text-muted">{fdate(a.created_at)}</td>
              <td className="td text-right">{owner && a.user_id !== session.user.id && <button className="btn-ghost" aria-label="Remove" onClick={() => remove(a.user_id)}><Trash2 size={16} /></button>}</td></tr>
          ))}
        </tbody></table>
      )}
      {owner && <div className="flex flex-wrap items-end gap-2"><Field label="Email of existing user"><input className="input w-64" value={email} onChange={e => setEmail(e.target.value)} /></Field><Field label="Role"><select className="input" value={r} onChange={e => setR(e.target.value)}><option>admin</option><option>staff</option><option>owner</option></select></Field><button className="btn-primary" disabled={!email} onClick={add}>Add administrator</button></div>}
    </div>
  )
}

export default function Settings() {
  return (
    <>
      <PageHeader title="Settings" />
      <SettingsForm title="Brand and business" fields={[
        { key: 'brand_name', label: 'Brand name' }, { key: 'business_email', label: 'Business email' }, { key: 'business_phone', label: 'Business phone' },
        { key: 'whatsapp_number', label: 'WhatsApp number', hint: 'With country code, e.g. 91XXXXXXXXXX' }, { key: 'gst_number', label: 'GST number' }
      ]} />
      <SettingsForm title="Shipping and payments" fields={[
        { key: 'shipping_charge', label: 'Shipping charge (₹)', type: 'number' }, { key: 'free_shipping_threshold', label: 'Free shipping above (₹)', type: 'number', hint: '0 = never free' },
        { key: 'cod_enabled', label: 'Cash on delivery enabled', type: 'checkbox' },
        { key: 'online_payments_enabled', label: 'Online payments enabled', type: 'checkbox', hint: 'Keep off until Razorpay server-side verification is configured' }
      ]} />
      <SettingsForm title="Inventory" fields={[{ key: 'low_stock_threshold', label: 'Low-stock threshold (units)', type: 'number' }]} />
      <Admins />
    </>
  )
}

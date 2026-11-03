import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useQuery, must } from '../lib/hooks'
import { inr, fdate, fdt, lbl, toast, ORDER_STATUSES, LEAD_STATUSES } from '../lib/utils'
import { Badge, Empty, ErrorBox, Modal, PageHeader, Spinner } from '../components/ui'

export default function Customers() {
  const [q, setQ] = useState(''); const [open, setOpen] = useState<any>(null)
  const { data, loading, error } = useQuery(async () => {
    const [p, o] = await Promise.all([supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(1000), supabase.from('orders').select('customer_id,total,status').not('customer_id', 'is', null).limit(10000)])
    const profiles = must(p), orders = must(o)
    const agg: Record<string, { n: number; spent: number }> = {}
    orders.forEach((x: any) => { const a = agg[x.customer_id] ||= { n: 0, spent: 0 }; a.n++; if (!['cancelled', 'returned'].includes(x.status)) a.spent += Number(x.total) })
    return profiles.map((c: any) => ({ ...c, orders: agg[c.id]?.n || 0, spent: agg[c.id]?.spent || 0 }))
  }, [])
  const rows = (data || []).filter((c: any) => `${c.full_name} ${c.email} ${c.phone}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <PageHeader title="Customers" sub="Registered storefront accounts. Spending excludes cancelled and returned orders." />
      <input className="input mb-3 max-w-xs" placeholder="Search name, email, phone…" value={q} onChange={e => setQ(e.target.value)} />
      <div className="card overflow-x-auto">
        {loading ? <Spinner /> : error ? <ErrorBox msg={error} /> : !rows.length ? <Empty text="No customers yet" /> : (
          <table className="w-full"><thead className="border-b border-line"><tr>{['Name', 'Email', 'Phone', 'Joined', 'Orders', 'Total spent', ''].map(h => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">{rows.map((c: any) => <tr key={c.id}><td className="td font-medium">{c.full_name || '—'}</td><td className="td">{c.email}</td><td className="td">{c.phone || '—'}</td><td className="td text-muted">{fdate(c.created_at)}</td><td className="td">{c.orders}</td><td className="td">{inr(c.spent)}</td><td className="td text-right"><button className="btn" onClick={() => setOpen(c)}>Open</button></td></tr>)}</tbody></table>
        )}
      </div>
      {open && <Profile c={open} onClose={() => setOpen(null)} />}
    </>
  )
}

function Profile({ c, onClose }: { c: any; onClose: () => void }) {
  const d = useQuery(async () => {
    const filters = [`customer_id.eq.${c.id}`, c.email && `email.eq.${c.email}`, c.phone && `phone.eq.${c.phone}`].filter(Boolean).join(',')
    const [o, l, n] = await Promise.all([
      supabase.from('orders').select('id,order_number,total,status,created_at').eq('customer_id', c.id).order('created_at', { ascending: false }),
      supabase.from('leads').select('id,product_interest,source,status,created_at').or(filters).order('created_at', { ascending: false }),
      supabase.from('customer_notes').select('note').eq('customer_id', c.id).maybeSingle()])
    return { orders: must(o), leads: must(l), note: n.data?.note || '' }
  }, [c.id])
  const [note, setNote] = useState<string | null>(null)
  async function save() { const { error } = await supabase.from('customer_notes').upsert({ customer_id: c.id, note, updated_at: new Date().toISOString() }); error ? toast(error.message, 'err') : toast('Note saved') }
  return (
    <Modal wide title={c.full_name || c.email} onClose={onClose}>
      {d.loading ? <Spinner /> : d.error ? <ErrorBox msg={d.error} /> : (
        <div className="space-y-5">
          <p className="text-sm">{c.email}{c.phone ? ` · ${c.phone}` : ''} · {c.orders} orders · {inr(c.spent)} spent</p>
          <div><h3 className="mb-1 text-sm font-semibold">Orders</h3>{!d.data!.orders.length ? <p className="text-sm text-muted">No orders yet.</p> : <table className="w-full"><tbody className="divide-y divide-line">{d.data!.orders.map((o: any) => <tr key={o.id}><td className="td font-medium">{o.order_number}</td><td className="td text-muted">{fdt(o.created_at)}</td><td className="td">{inr(o.total)}</td><td className="td"><Badge v={o.status} text={lbl(ORDER_STATUSES, o.status)} /></td></tr>)}</tbody></table>}</div>
          <div><h3 className="mb-1 text-sm font-semibold">Inquiries</h3>{!d.data!.leads.length ? <p className="text-sm text-muted">No inquiries yet.</p> : <table className="w-full"><tbody className="divide-y divide-line">{d.data!.leads.map((l: any) => <tr key={l.id}><td className="td">{l.product_interest || l.source}</td><td className="td text-muted">{fdt(l.created_at)}</td><td className="td"><Badge v={l.status} text={lbl(LEAD_STATUSES, l.status)} /></td></tr>)}</tbody></table>}</div>
          <div><h3 className="mb-1 text-sm font-semibold">Internal notes</h3><textarea rows={3} className="input" value={note ?? d.data!.note} onChange={e => setNote(e.target.value)} /><div className="mt-2 flex justify-end"><button className="btn-primary" onClick={save}>Save note</button></div></div>
        </div>
      )}
    </Modal>
  )
}

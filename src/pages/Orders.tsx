import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useQuery, must } from '../lib/hooks'
import { inr, fdt, fdate, lbl, toast, waLink, ORDER_STATUSES, PAY_STATUSES } from '../lib/utils'
import { Badge, Empty, ErrorBox, Field, Modal, PageHeader, Spinner } from '../components/ui'

const COURIERS = ['Blue Dart', 'Delhivery', 'DTDC', 'India Post', 'DHL', 'Shiprocket', 'Other']
const addr = (a: any) => a ? [a.full_name, a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(', ') : '—'

export default function Orders() {
  const [q, setQ] = useState(''); const [st, setSt] = useState(''); const [ps, setPs] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [open, setOpen] = useState<string | null>(null)
  const { data, loading, error, reload } = useQuery(async () => {
    let r = supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(300)
    if (st) r = r.eq('status', st); if (ps) r = r.eq('payment_status', ps)
    if (from) r = r.gte('created_at', new Date(from).toISOString())
    if (to) r = r.lt('created_at', new Date(new Date(to).getTime() + 86400000).toISOString())
    if (q.trim()) { const s = q.trim().replace(/[,()]/g, ' '); r = r.or(`order_number.ilike.%${s}%,customer_name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%`) }
    return must(await r)
  }, [q, st, ps, from, to])
  return (
    <>
      <PageHeader title="Orders" />
      <div className="mb-3 grid gap-2 sm:grid-cols-5">
        <input className="input sm:col-span-2" placeholder="Search order no., name, phone, email…" value={q} onChange={e => setQ(e.target.value)} />
        <select className="input" value={st} onChange={e => setSt(e.target.value)}><option value="">All delivery statuses</option>{ORDER_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select className="input" value={ps} onChange={e => setPs(e.target.value)}><option value="">All payment statuses</option>{PAY_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <div className="flex gap-1"><input type="date" aria-label="From" className="input" value={from} onChange={e => setFrom(e.target.value)} /><input type="date" aria-label="To" className="input" value={to} onChange={e => setTo(e.target.value)} /></div>
      </div>
      <div className="card overflow-x-auto">
        {loading ? <Spinner /> : error ? <ErrorBox msg={error} /> : !data?.length ? <Empty text="No orders match these filters" /> : (
          <table className="w-full"><thead className="border-b border-line"><tr>{['Order', 'Date', 'Customer', 'Total', 'Payment', 'Status', ''].map(h => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">{data.map((o: any) => <tr key={o.id} className="hover:bg-paper/60"><td className="td font-medium">{o.order_number}</td><td className="td text-muted">{fdt(o.created_at)}</td><td className="td">{o.customer_name}<div className="text-xs text-muted">{o.phone}</div></td><td className="td">{inr(o.total)}</td>
              <td className="td"><Badge v={o.payment_status} /> <span className="text-xs text-muted">{o.payment_method}</span></td><td className="td"><Badge v={o.status} text={lbl(ORDER_STATUSES, o.status)} /></td><td className="td text-right"><button className="btn" onClick={() => setOpen(o.id)}>Open</button></td></tr>)}</tbody></table>
        )}
      </div>
      {open && <OrderDetail id={open} onClose={() => { setOpen(null); reload() }} />}
    </>
  )
}

function OrderDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: o, loading, error, reload } = useQuery(async () => must(await supabase.from('orders').select('*, order_items(*), shipments(*), order_status_history(*)').eq('id', id).single()), [id])
  const [f, setF] = useState<any>(null); const [busy, setBusy] = useState(false)
  useEffect(() => { if (!o) return; const s = Array.isArray(o.shipments) ? o.shipments[0] : o.shipments; setF({ status: o.status, payment_status: o.payment_status, internal_notes: o.internal_notes || '', note: '', courier: s?.courier || '', tracking_number: s?.tracking_number || '', expected_delivery: s?.expected_delivery || '', dispatched_at: s?.dispatched_at || '' }) }, [o])

  async function save() {
    setBusy(true)
    if ((f.status === 'cancelled' || f.status === 'returned') && f.status !== o.status && !confirm(`Mark this order as ${f.status}? Stock will be returned to inventory.`)) { setBusy(false); return }
    const upd: any = { payment_status: f.payment_status, internal_notes: f.internal_notes || null }
    if (f.status !== o.status) { upd.status = f.status; upd.last_status_note = f.note || null }
    const r1 = await supabase.from('orders').update(upd).eq('id', id)
    if (r1.error) { setBusy(false); return toast(r1.error.message, 'err') }
    if (f.courier || f.tracking_number || f.expected_delivery || f.dispatched_at) {
      const r2 = await supabase.from('shipments').upsert({ order_id: id, courier: f.courier || null, tracking_number: f.tracking_number || null, expected_delivery: f.expected_delivery || null, dispatched_at: f.dispatched_at || (f.status === 'shipped' ? new Date().toISOString().slice(0, 10) : null), status: ['shipped', 'out_for_delivery', 'delivered'].includes(f.status) ? f.status : 'pending' }, { onConflict: 'order_id' })
      if (r2.error) { setBusy(false); return toast(r2.error.message, 'err') }
    }
    setBusy(false); toast('Order updated'); reload()
  }
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }))
  return (
    <Modal wide title={o ? `Order ${o.order_number}` : 'Order'} onClose={onClose}>
      {loading || !o || !f ? (error ? <ErrorBox msg={error} /> : <Spinner />) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><h3 className="mb-1 text-sm font-semibold">Customer</h3><p className="text-sm">{o.customer_name}<br />{o.phone}<br />{o.email}</p>
              <a className="btn mt-2" href={waLink(o.phone, `Hello ${o.customer_name}, about your PARQH order ${o.order_number}`)} target="_blank" rel="noreferrer"><MessageCircle size={15} />WhatsApp</a></div>
            <div><h3 className="mb-1 text-sm font-semibold">Delivery address</h3><p className="text-sm">{addr(o.shipping_address)}</p>{o.billing_address && <><h3 className="mb-1 mt-2 text-sm font-semibold">Billing address</h3><p className="text-sm">{addr(o.billing_address)}</p></>}</div>
          </div>
          <div><h3 className="mb-1 text-sm font-semibold">Items</h3>
            <table className="w-full"><tbody className="divide-y divide-line">{o.order_items.map((i: any) => <tr key={i.id}><td className="td"><div className="font-medium">{i.title}</div><div className="text-xs text-muted">{[i.size && `Size ${i.size}`, i.color].filter(Boolean).join(' · ')}</div>
              {i.customization && Object.keys(i.customization).length > 0 && <pre className="mt-1 whitespace-pre-wrap rounded bg-paper p-2 text-xs">{Object.entries(i.customization).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join('\n')}</pre>}</td><td className="td">× {i.qty}</td><td className="td text-right">{inr(i.unit_price * i.qty)}</td></tr>)}</tbody></table>
            <div className="mt-2 space-y-0.5 text-right text-sm"><div>Subtotal {inr(o.subtotal)}</div>{Number(o.discount) > 0 && <div>Discount −{inr(o.discount)}{o.coupon_code ? ` (${o.coupon_code})` : ''}</div>}<div>Shipping {inr(o.shipping)}</div><div className="font-semibold">Total {inr(o.total)} · {o.payment_method.toUpperCase()}</div></div></div>
          <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-3">
            <Field label="Order status"><select className="input" value={f.status} onChange={e => set('status', e.target.value)}>{ORDER_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="Payment status"><select className="input" value={f.payment_status} onChange={e => set('payment_status', e.target.value)}>{PAY_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field label="Note for status history"><input className="input" value={f.note} onChange={e => set('note', e.target.value)} placeholder="Shown in the timeline" /></Field>
            <Field label="Courier"><select className="input" value={f.courier} onChange={e => set('courier', e.target.value)}><option value="">—</option>{COURIERS.map(c => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Tracking number"><input className="input" value={f.tracking_number} onChange={e => set('tracking_number', e.target.value)} /></Field>
            <Field label="Expected delivery"><input type="date" className="input" value={f.expected_delivery} onChange={e => set('expected_delivery', e.target.value)} /></Field>
            <Field label="Internal notes (never shown to the customer)" className="sm:col-span-3"><textarea rows={2} className="input" value={f.internal_notes} onChange={e => set('internal_notes', e.target.value)} /></Field>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {!['cancelled', 'returned'].includes(o.status) && <button className="btn-danger" onClick={() => set('status', 'cancelled')}>Cancel order</button>}
            {o.status === 'delivered' && <button className="btn-danger" onClick={() => setF({ ...f, status: 'returned', payment_status: 'refunded' })}>Process return and refund</button>}
            <button className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</button></div>
          <div><h3 className="mb-1 text-sm font-semibold">Status history</h3><ol className="space-y-1 text-sm">{[...o.order_status_history].sort((a: any, b: any) => +new Date(b.created_at) - +new Date(a.created_at)).map((h: any) => <li key={h.id} className="flex gap-3"><span className="w-32 shrink-0 text-muted">{fdt(h.created_at)}</span><span><b>{lbl(ORDER_STATUSES, h.status)}</b>{h.note ? ` — ${h.note}` : ''}</span></li>)}</ol></div>
        </div>
      )}
    </Modal>
  )
}

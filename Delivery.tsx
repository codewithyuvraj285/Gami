import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useQuery, must } from '../lib/hooks'
import { toast, fdate, lbl, ORDER_STATUSES } from '../lib/utils'
import { Badge, Empty, ErrorBox, Field, Modal, PageHeader, Spinner, Tabs } from '../components/ui'

const GROUPS: Record<string, string[]> = { pending: ['confirmed', 'processing', 'production', 'quality_check', 'ready_to_ship'], shipped: ['shipped', 'out_for_delivery'], delivered: ['delivered'] }
const COURIERS = ['Blue Dart', 'Delhivery', 'DTDC', 'India Post', 'DHL', 'Shiprocket', 'Other']
const addr = (a: any) => a ? [a.line1, a.line2, a.city, a.state, a.pincode].filter(Boolean).join(', ') : '—'

export default function Delivery() {
  const [tab, setTab] = useState('pending'); const [sel, setSel] = useState<any>(null); const [busy, setBusy] = useState(false)
  const { data, loading, error, reload } = useQuery(async () => must(await supabase.from('orders').select('id,order_number,customer_name,phone,status,shipping_address,shipments(*)').in('status', GROUPS[tab]).order('created_at', { ascending: false }).limit(300)), [tab])

  async function save(markShipped: boolean) {
    setBusy(true)
    const s = sel.ship
    const { error } = await supabase.from('shipments').upsert({ order_id: sel.id, courier: s.courier || null, tracking_number: s.tracking_number || null, dispatched_at: s.dispatched_at || null, expected_delivery: s.expected_delivery || null, status: markShipped ? 'shipped' : s.status || 'pending' }, { onConflict: 'order_id' })
    if (!error && markShipped) {
      const r = await supabase.from('orders').update({ status: 'shipped', last_status_note: `Shipped via ${s.courier || 'courier'}${s.tracking_number ? ' · ' + s.tracking_number : ''}` }).eq('id', sel.id)
      if (r.error) { setBusy(false); return toast(r.error.message, 'err') }
    }
    setBusy(false)
    if (error) return toast(error.message, 'err')
    toast('Shipment saved'); setSel(null); reload()
  }
  async function setStatus(status: string) {
    const { error } = await supabase.from('orders').update({ status }).eq('id', sel.id)
    if (error) return toast(error.message, 'err')
    if (status === 'delivered') await supabase.from('shipments').upsert({ order_id: sel.id, status: 'delivered' }, { onConflict: 'order_id' })
    toast('Status updated'); setSel(null); reload()
  }
  return (
    <>
      <PageHeader title="Delivery" sub="Manual shipment updates. The shipment table already has a field reserved for a Shiprocket reference." />
      <Tabs tabs={[['pending', 'Pending shipments'], ['shipped', 'Shipped'], ['delivered', 'Delivered']]} value={tab} onChange={setTab} />
      <div className="card overflow-x-auto">
        {loading ? <Spinner /> : error ? <ErrorBox msg={error} /> : !data?.length ? <Empty text="No orders in this stage" /> : (
          <table className="w-full"><thead className="border-b border-line"><tr>{['Order', 'Customer', 'Ship to', 'Courier', 'Tracking', 'Dispatched', 'Expected', 'Status', ''].map(h => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">{data.map((o: any) => { const s = Array.isArray(o.shipments) ? o.shipments[0] : o.shipments; return (
              <tr key={o.id}><td className="td font-medium">{o.order_number}</td><td className="td">{o.customer_name}<div className="text-xs text-muted">{o.phone}</div></td><td className="td max-w-[14rem] text-muted">{addr(o.shipping_address)}</td>
                <td className="td">{s?.courier || '—'}</td><td className="td">{s?.tracking_number || '—'}</td><td className="td">{fdate(s?.dispatched_at)}</td><td className="td">{fdate(s?.expected_delivery)}</td>
                <td className="td"><Badge v={o.status} text={lbl(ORDER_STATUSES, o.status)} /></td><td className="td text-right"><button className="btn" onClick={() => setSel({ ...o, ship: { ...(s || {}) } })}>Update</button></td></tr>) })}</tbody></table>
        )}
      </div>
      {sel && (
        <Modal title={`Shipment · ${sel.order_number}`} onClose={() => setSel(null)}>
          <p className="mb-3 text-sm text-muted">{sel.customer_name} · {addr(sel.shipping_address)}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Courier partner"><select className="input" value={sel.ship.courier || ''} onChange={e => setSel({ ...sel, ship: { ...sel.ship, courier: e.target.value } })}><option value="">Select…</option>{COURIERS.map(c => <option key={c}>{c}</option>)}</select></Field>
            <Field label="Tracking number"><input className="input" value={sel.ship.tracking_number || ''} onChange={e => setSel({ ...sel, ship: { ...sel.ship, tracking_number: e.target.value } })} /></Field>
            <Field label="Dispatch date"><input type="date" className="input" value={sel.ship.dispatched_at || ''} onChange={e => setSel({ ...sel, ship: { ...sel.ship, dispatched_at: e.target.value } })} /></Field>
            <Field label="Expected delivery"><input type="date" className="input" value={sel.ship.expected_delivery || ''} onChange={e => setSel({ ...sel, ship: { ...sel.ship, expected_delivery: e.target.value } })} /></Field>
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button className="btn" disabled={busy} onClick={() => save(false)}>Save details</button>
            {tab === 'pending' && <button className="btn-primary" disabled={busy || !sel.ship.courier || !sel.ship.tracking_number} onClick={() => save(true)}>Save and mark shipped</button>}
            {tab === 'shipped' && <><button className="btn" onClick={() => setStatus('out_for_delivery')}>Out for delivery</button><button className="btn-primary" onClick={() => setStatus('delivered')}>Mark delivered</button></>}
          </div>
        </Modal>
      )}
    </>
  )
}

import { useState } from 'react'
import { Download } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useQuery, must } from '../lib/hooks'
import { inr, downloadCSV, lbl, LEAD_STATUSES, ORDER_STATUSES } from '../lib/utils'
import { Empty, ErrorBox, PageHeader, Spinner, Stat, Tabs } from '../components/ui'

const key = (d: Date, mode: string) => { if (mode === 'day') return d.toISOString().slice(0, 10); if (mode === 'month') return d.toISOString().slice(0, 7); const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return 'Week of ' + x.toISOString().slice(0, 10) }

export default function Reports() {
  const [mode, setMode] = useState('day')
  const { data, loading, error } = useQuery(async () => {
    const [o, i, l, p] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(10000),
      supabase.from('order_items').select('title,qty,unit_price,orders(status)').limit(20000),
      supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(10000),
      supabase.from('inventory').select('*')])
    return { orders: must(o), items: must(i), leads: must(l), inv: must(p) }
  }, [])
  if (loading) return <Spinner />
  if (error || !data) return <ErrorBox msg={error || 'Could not load'} />
  const live = data.orders.filter((o: any) => !['cancelled', 'returned'].includes(o.status))
  const sales: Record<string, { n: number; rev: number }> = {}
  live.forEach((o: any) => { const k = key(new Date(o.created_at), mode); const s = sales[k] ||= { n: 0, rev: 0 }; s.n++; s.rev += Number(o.total) })
  const prod: Record<string, { q: number; rev: number }> = {}
  data.items.filter((x: any) => !['cancelled', 'returned'].includes(x.orders?.status)).forEach((x: any) => { const p = prod[x.title] ||= { q: 0, rev: 0 }; p.q += x.qty; p.rev += x.qty * Number(x.unit_price) })
  const byStatus = (list: any[], st: string) => list.filter(x => x.status === st).length
  const conv = data.leads.length ? Math.round(byStatus(data.leads, 'converted') / data.leads.length * 100) : 0
  return (
    <>
      <PageHeader title="Reports"><button className="btn" onClick={() => downloadCSV('orders', data.orders.map((o: any) => ({ order_number: o.order_number, date: o.created_at, customer: o.customer_name, phone: o.phone, email: o.email, status: o.status, payment_status: o.payment_status, payment_method: o.payment_method, subtotal: o.subtotal, discount: o.discount, shipping: o.shipping, total: o.total })))}><Download size={15} />Orders CSV</button>
        <button className="btn" onClick={() => downloadCSV('leads', data.leads.map((l: any) => ({ date: l.created_at, name: l.name, phone: l.phone, email: l.email, interest: l.product_interest, occasion: l.occasion, budget: l.budget, required_date: l.required_date, source: l.source, status: l.status })))}><Download size={15} />Leads CSV</button>
        <button className="btn" onClick={() => downloadCSV('inventory', data.inv.map((v: any) => ({ product: v.title, sku: v.product_sku, size: v.size, colour: v.color, stock: v.stock_qty, made_to_order: v.made_to_order })))}><Download size={15} />Inventory CSV</button></PageHeader>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Total revenue" value={inr(live.reduce((s: number, o: any) => s + Number(o.total), 0))} /><Stat label="Orders" value={data.orders.length} /><Stat label="Leads" value={data.leads.length} /><Stat label="Lead conversion" value={`${conv}%`} /></div>
      <div className="card mb-4"><div className="p-4 pb-0"><Tabs tabs={[['day', 'Daily sales'], ['week', 'Weekly sales'], ['month', 'Monthly sales']]} value={mode} onChange={setMode} /></div>
        {!Object.keys(sales).length ? <Empty text="No sales yet" /> : <div className="max-h-80 overflow-y-auto"><table className="w-full"><thead className="border-b border-line"><tr><th className="th">Period</th><th className="th">Orders</th><th className="th">Revenue</th></tr></thead><tbody className="divide-y divide-line">{Object.entries(sales).sort((a, b) => b[0].localeCompare(a[0])).map(([k, v]) => <tr key={k}><td className="td">{k}</td><td className="td">{v.n}</td><td className="td">{inr(v.rev)}</td></tr>)}</tbody></table></div>}</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4"><h2 className="mb-2 text-sm font-semibold">Product performance</h2>{!Object.keys(prod).length ? <Empty text="No sales yet" /> : Object.entries(prod).sort((a, b) => b[1].rev - a[1].rev).slice(0, 15).map(([t, v]) => <div key={t} className="flex justify-between border-b border-line py-1.5 text-sm last:border-0"><span>{t}</span><span className="text-muted">{v.q} sold · {inr(v.rev)}</span></div>)}</div>
        <div className="card p-4"><h2 className="mb-2 text-sm font-semibold">Orders by status</h2>{ORDER_STATUSES.map(([v, l]) => <div key={v} className="flex justify-between border-b border-line py-1.5 text-sm last:border-0"><span>{l}</span><span>{byStatus(data.orders, v)}</span></div>)}
          <h2 className="mb-2 mt-4 text-sm font-semibold">Leads by status</h2>{LEAD_STATUSES.map(([v, l]) => <div key={v} className="flex justify-between border-b border-line py-1.5 text-sm last:border-0"><span>{l}</span><span>{byStatus(data.leads, v)}</span></div>)}</div>
      </div>
    </>
  )
}

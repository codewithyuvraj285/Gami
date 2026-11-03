import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line } from 'recharts'
import { supabase } from '../lib/supabase'
import { useQuery } from '../lib/hooks'
import { inr, fdt, lbl, ORDER_STATUSES } from '../lib/utils'
import { Badge, Spinner, ErrorBox, Stat, PageHeader, Empty } from '../components/ui'
import { Link } from 'react-router-dom'

const OPEN = ['new', 'confirmed', 'processing', 'production', 'quality_check', 'ready_to_ship', 'shipped', 'out_for_delivery']
const count = async (q: any) => { const { count, error } = await q; if (error) throw new Error(error.message); return count || 0 }

export default function Dashboard() {
  const { data: d, loading, error } = useQuery(async () => {
    const ok = (r: any) => { if (r.error) throw new Error(r.error.message); return r.data }
    const [orders, prods, variants, items, leads, thr, customers] = await Promise.all([
      supabase.from('orders').select('id,order_number,customer_name,total,status,created_at').order('created_at', { ascending: false }).limit(5000).then(ok),
      supabase.from('products').select('id,status,made_to_order').then(ok),
      supabase.from('product_variants').select('id,product_id,size,color,stock_qty,products(title)').then(ok),
      supabase.from('order_items').select('title,qty,unit_price,orders(status)').limit(5000).then(ok),
      supabase.from('leads').select('id,name,status,source,product_interest,created_at').order('created_at', { ascending: false }).limit(3000).then(ok),
      supabase.from('website_settings').select('value').eq('key', 'low_stock_threshold').maybeSingle().then(ok),
      count(supabase.from('profiles').select('id', { count: 'exact', head: true }))
    ])
    return { orders, prods, variants, items, leads, threshold: Number(thr?.value ?? 3), customers }
  }, [])
  if (loading) return <Spinner />
  if (error || !d) return <ErrorBox msg={error || 'Could not load'} />

  const live = d.orders.filter((o: any) => !['cancelled', 'returned'].includes(o.status))
  const revenue = live.reduce((s: number, o: any) => s + Number(o.total), 0)
  const stockBy: Record<string, number> = {}
  d.variants.forEach((v: any) => { stockBy[v.product_id] = (stockBy[v.product_id] || 0) + v.stock_qty })
  const outOfStock = d.prods.filter((p: any) => !p.made_to_order && (stockBy[p.id] || 0) === 0).length
  const low = d.variants.filter((v: any) => v.stock_qty <= d.threshold).sort((a: any, b: any) => a.stock_qty - b.stock_qty).slice(0, 8)

  const months: { m: string; revenue: number }[] = []
  for (let i = 5; i >= 0; i--) { const dt = new Date(); dt.setDate(1); dt.setMonth(dt.getMonth() - i); months.push({ m: dt.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }), revenue: 0 }) }
  const days: { day: string; sales: number }[] = []
  for (let i = 13; i >= 0; i--) { const dt = new Date(); dt.setDate(dt.getDate() - i); days.push({ day: dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), sales: 0 }) }
  live.forEach((o: any) => {
    const dt = new Date(o.created_at)
    const m = months.find(x => x.m === dt.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })); if (m) m.revenue += Number(o.total)
    const dd = days.find(x => x.day === dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })); if (dd) dd.sales += Number(o.total)
  })
  const sold: Record<string, number> = {}
  d.items.filter((i: any) => !['cancelled', 'returned'].includes(i.orders?.status)).forEach((i: any) => { sold[i.title] = (sold[i.title] || 0) + i.qty })
  const best = Object.entries(sold).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const openLeads = d.leads.filter((l: any) => !['converted', 'not_interested', 'closed'].includes(l.status))

  return (
    <>
      <PageHeader title="Dashboard" sub="Live figures from the database. Revenue excludes cancelled and returned orders." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Total revenue" value={inr(revenue)} /><Stat label="Total orders" value={d.orders.length} />
        <Stat label="Pending orders" value={d.orders.filter((o: any) => OPEN.includes(o.status)).length} tone="text-amber-700" />
        <Stat label="Completed orders" value={d.orders.filter((o: any) => o.status === 'delivered').length} tone="text-green-700" />
        <Stat label="Cancelled orders" value={d.orders.filter((o: any) => o.status === 'cancelled').length} />
        <Stat label="Products (active / total)" value={`${d.prods.filter((p: any) => p.status === 'published').length} / ${d.prods.length}`} />
        <Stat label="Out-of-stock products" value={outOfStock} tone={outOfStock ? 'text-red-700' : ''} /><Stat label="Customers" value={d.customers} />
        <Stat label="New leads" value={d.leads.filter((l: any) => l.status === 'new').length} tone="text-wine" /><Stat label="Pending inquiries" value={openLeads.length} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card p-4"><h2 className="mb-2 text-sm font-semibold">Monthly revenue</h2><div className="h-56"><ResponsiveContainer><BarChart data={months}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="m" fontSize={12} /><YAxis fontSize={12} width={60} /><Tooltip formatter={(v: any) => inr(v)} /><Bar dataKey="revenue" fill="#8c2f4f" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
        <div className="card p-4"><h2 className="mb-2 text-sm font-semibold">Sales, last 14 days</h2><div className="h-56"><ResponsiveContainer><LineChart data={days}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="day" fontSize={11} /><YAxis fontSize={12} width={60} /><Tooltip formatter={(v: any) => inr(v)} /><Line dataKey="sales" stroke="#1d1a26" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div></div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card"><div className="flex justify-between p-4 pb-2"><h2 className="text-sm font-semibold">Recent orders</h2><Link to="/orders" className="text-sm text-wine">View all</Link></div>
          {!d.orders.length ? <Empty text="No orders yet" /> : <table className="w-full"><tbody className="divide-y divide-line">{d.orders.slice(0, 6).map((o: any) => <tr key={o.id}><td className="td font-medium">{o.order_number}</td><td className="td">{o.customer_name}</td><td className="td">{inr(o.total)}</td><td className="td"><Badge v={o.status} text={lbl(ORDER_STATUSES, o.status)} /></td></tr>)}</tbody></table>}</div>
        <div className="card"><div className="flex justify-between p-4 pb-2"><h2 className="text-sm font-semibold">Recent inquiries</h2><Link to="/leads" className="text-sm text-wine">View all</Link></div>
          {!d.leads.length ? <Empty text="No inquiries yet" /> : <table className="w-full"><tbody className="divide-y divide-line">{d.leads.slice(0, 6).map((l: any) => <tr key={l.id}><td className="td font-medium">{l.name}</td><td className="td">{l.product_interest || l.source.replace(/_/g, ' ')}</td><td className="td text-muted">{fdt(l.created_at)}</td><td className="td"><Badge v={l.status} /></td></tr>)}</tbody></table>}</div>
        <div className="card p-4"><h2 className="mb-2 text-sm font-semibold">Best-selling products</h2>{!best.length ? <Empty text="No sales yet" /> : best.map(([t, q]) => <div key={t} className="flex justify-between border-b border-line py-2 text-sm last:border-0"><span>{t}</span><span className="text-muted">{q} sold</span></div>)}</div>
        <div className="card p-4"><h2 className="mb-2 text-sm font-semibold">Low-stock alerts (≤ {d.threshold})</h2>{!low.length ? <Empty text="Nothing is running low" /> : low.map((v: any) => <div key={v.id} className="flex justify-between border-b border-line py-2 text-sm last:border-0"><span>{v.products?.title} · {v.size}{v.color ? ` · ${v.color}` : ''}</span><Badge v={v.stock_qty === 0 ? 'out' : 'low'} text={`${v.stock_qty} left`} /></div>)}</div>
      </div>
    </>
  )
}

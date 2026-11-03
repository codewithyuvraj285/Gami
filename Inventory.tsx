import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useQuery, must } from '../lib/hooks'
import { toast, fdt } from '../lib/utils'
import { Badge, Empty, ErrorBox, Field, Modal, PageHeader, Spinner, Stat, Tabs } from '../components/ui'

export default function Inventory() {
  const [tab, setTab] = useState('stock'); const [q, setQ] = useState(''); const [adj, setAdj] = useState<any>(null); const [busy, setBusy] = useState(false)
  const stock = useQuery(async () => {
    const rows = must(await supabase.from('product_variants').select('id,size,color,sku,stock_qty,products(title,sku,made_to_order)').order('created_at', { ascending: false }))
    const thr = (await supabase.from('website_settings').select('value').eq('key', 'low_stock_threshold').maybeSingle()).data?.value
    return { rows, thr: Number(thr ?? 3) }
  }, [])
  const hist = useQuery(async () => must(await supabase.from('inventory_transactions').select('*, products(title), product_variants(size,color)').order('created_at', { ascending: false }).limit(300)), [])

  async function apply() {
    setBusy(true)
    const { error } = await supabase.rpc('adjust_stock', { p_variant: adj.id, p_type: adj.type, p_qty: Number(adj.qty), p_note: adj.note || null })
    setBusy(false)
    if (error) return toast(error.message, 'err')
    toast('Stock updated'); setAdj(null); stock.reload(); hist.reload()
  }
  const rows = (stock.data?.rows || []).filter((r: any) => `${r.products?.title} ${r.products?.sku} ${r.size} ${r.color}`.toLowerCase().includes(q.toLowerCase()))
  const thr = stock.data?.thr ?? 3
  const ready = (stock.data?.rows || []).filter((r: any) => !r.products?.made_to_order)
  return (
    <>
      <PageHeader title="Inventory" sub="Made-to-order products are not stock-limited, so they never block an order." />
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Total units in stock" value={ready.reduce((s: number, r: any) => s + r.stock_qty, 0)} />
        <Stat label="Low stock variants" value={ready.filter((r: any) => r.stock_qty > 0 && r.stock_qty <= thr).length} tone="text-amber-700" />
        <Stat label="Out-of-stock variants" value={ready.filter((r: any) => r.stock_qty === 0).length} tone="text-red-700" />
      </div>
      <Tabs tabs={[['stock', 'Stock by variant'], ['history', 'Stock history']]} value={tab} onChange={setTab} />
      {tab === 'stock' ? (
        <>
          <input className="input mb-3 max-w-xs" placeholder="Search product, SKU, size…" value={q} onChange={e => setQ(e.target.value)} />
          <div className="card overflow-x-auto">
            {stock.loading ? <Spinner /> : stock.error ? <ErrorBox msg={stock.error} /> : !rows.length ? <Empty text="No variants yet. Add sizes to a product under Products → Variants." /> : (
              <table className="w-full"><thead className="border-b border-line"><tr>{['Product', 'SKU', 'Size', 'Colour', 'In stock', 'Status', ''].map(h => <th key={h} className="th">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-line">{rows.map((r: any) => {
                  const mto = r.products?.made_to_order
                  return <tr key={r.id}><td className="td font-medium">{r.products?.title}</td><td className="td text-muted">{r.products?.sku || '—'}</td><td className="td">{r.size}</td><td className="td">{r.color || '—'}</td><td className="td">{r.stock_qty}</td>
                    <td className="td">{mto ? <Badge v="active" text="Made to order" /> : r.stock_qty === 0 ? <Badge v="out" text="Out of stock" /> : r.stock_qty <= thr ? <Badge v="low" text="Low" /> : <Badge v="ok" text="In stock" />}</td>
                    <td className="td text-right"><button className="btn" onClick={() => setAdj({ ...r, type: 'stock_in', qty: '', note: '' })}>Adjust</button></td></tr>
                })}</tbody></table>
            )}
          </div>
        </>
      ) : (
        <div className="card overflow-x-auto">
          {hist.loading ? <Spinner /> : hist.error ? <ErrorBox msg={hist.error} /> : !hist.data?.length ? <Empty text="No stock movements recorded yet" /> : (
            <table className="w-full"><thead className="border-b border-line"><tr>{['When', 'Product', 'Variant', 'Type', 'Change', 'Note'].map(h => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-line">{hist.data.map((t: any) => <tr key={t.id}><td className="td text-muted">{fdt(t.created_at)}</td><td className="td">{t.products?.title}</td><td className="td">{t.product_variants?.size}{t.product_variants?.color ? ` · ${t.product_variants.color}` : ''}</td><td className="td">{t.type.replace('_', ' ')}</td><td className={`td font-medium ${t.qty < 0 ? 'text-red-700' : 'text-green-700'}`}>{t.qty > 0 ? '+' : ''}{t.qty}</td><td className="td text-muted">{t.note}</td></tr>)}</tbody></table>
          )}
        </div>
      )}
      {adj && (
        <Modal title={`Adjust stock · ${adj.products?.title} (${adj.size})`} onClose={() => setAdj(null)}>
          <p className="mb-3 text-sm text-muted">Current stock: <b>{adj.stock_qty}</b></p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Action"><select className="input" value={adj.type} onChange={e => setAdj({ ...adj, type: e.target.value })}><option value="stock_in">Stock in (add)</option><option value="stock_out">Stock out (remove)</option><option value="adjustment">Set to exact count</option></select></Field>
            <Field label={adj.type === 'adjustment' ? 'New count' : 'Quantity'}><input className="input" type="number" min={0} value={adj.qty} onChange={e => setAdj({ ...adj, qty: e.target.value })} /></Field>
            <Field label="Note" className="sm:col-span-2"><input className="input" value={adj.note} onChange={e => setAdj({ ...adj, note: e.target.value })} placeholder="e.g. Fresh batch from workshop" /></Field>
          </div>
          <div className="mt-5 flex justify-end gap-2"><button className="btn" onClick={() => setAdj(null)}>Cancel</button><button className="btn-primary" disabled={busy || adj.qty === ''} onClick={apply}>{busy ? 'Saving…' : 'Update stock'}</button></div>
        </Modal>
      )}
    </>
  )
}

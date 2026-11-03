import { useState } from 'react'
import { Plus, Pencil, Trash2, Star, X } from 'lucide-react'
import { supabase, BUCKET, publicUrl } from '../lib/supabase'
import { useQuery, must } from '../lib/hooks'
import { inr, slugify, csvList, toast } from '../lib/utils'
import { Badge, Empty, ErrorBox, Field, Modal, PageHeader, Spinner } from '../components/ui'

const BLANK = { title: '', slug: '', sku: '', description: '', category_id: '', price: '', sale_price: '', fabric: '', tags: '', colors: '', occasions: '', sizes: '', status: 'draft', is_featured: false, is_best_seller: false, is_new_arrival: false, customizable: false, made_to_order: false, dispatch_days: '', delivery_info: '' }
const toForm = (p: any) => ({ ...BLANK, ...p, category_id: p.category_id || '', price: p.price ?? '', sale_price: p.sale_price ?? '', dispatch_days: p.dispatch_days ?? '', sku: p.sku || '', tags: (p.tags || []).join(', '), colors: (p.colors || []).join(', '), occasions: (p.occasions || []).join(', '), sizes: (p.sizes || []).join(', ') })

export default function Products() {
  const [q, setQ] = useState(''); const [st, setSt] = useState(''); const [f, setF] = useState<any>(null); const [busy, setBusy] = useState(false)
  const list = useQuery(async () => must(await supabase.from('products').select('*, categories(name), product_images(url,is_primary), product_variants(stock_qty)').order('created_at', { ascending: false })), [])
  const cats = useQuery(async () => must(await supabase.from('categories').select('id,name').order('sort_order')), [])
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }))

  async function save() {
    if (!f.title.trim()) return toast('Title is required', 'err')
    if (f.price === '' || Number(f.price) < 0) return toast('Enter a valid price', 'err')
    if (f.sale_price !== '' && Number(f.sale_price) > Number(f.price)) return toast('Discounted price cannot exceed the regular price', 'err')
    const p = { title: f.title.trim(), slug: f.slug.trim() || slugify(f.title), sku: f.sku.trim() || null, description: f.description || null, category_id: f.category_id || null,
      price: Number(f.price), sale_price: f.sale_price === '' ? null : Number(f.sale_price), fabric: f.fabric || null, tags: csvList(f.tags), colors: csvList(f.colors), occasions: csvList(f.occasions), sizes: csvList(f.sizes),
      status: f.status, is_featured: f.is_featured, is_best_seller: f.is_best_seller, is_new_arrival: f.is_new_arrival, customizable: f.customizable, made_to_order: f.made_to_order,
      dispatch_days: f.dispatch_days === '' ? null : Number(f.dispatch_days), delivery_info: f.delivery_info || null }
    setBusy(true)
    const res = f.id ? await supabase.from('products').update(p).eq('id', f.id).select().single() : await supabase.from('products').insert(p).select().single()
    setBusy(false)
    if (res.error) return toast(res.error.message.includes('duplicate') ? 'That SKU or URL slug is already used by another product' : res.error.message, 'err')
    toast(f.id ? 'Product saved' : 'Product created. You can now add photos and variants.'); setF(toForm(res.data)); list.reload()
  }
  async function togglePublish(p: any) {
    const { error } = await supabase.from('products').update({ status: p.status === 'published' ? 'draft' : 'published' }).eq('id', p.id)
    error ? toast(error.message, 'err') : (toast(p.status === 'published' ? 'Unpublished' : 'Published'), list.reload())
  }
  async function del(p: any) {
    if (!confirm(`Delete “${p.title}” and all its photos and variants? Past orders keep their line items.`)) return
    const { data: imgs } = await supabase.from('product_images').select('path').eq('product_id', p.id)
    const paths = (imgs || []).map((i: any) => i.path).filter(Boolean)
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
    const { error } = await supabase.from('products').delete().eq('id', p.id)
    error ? toast(error.message, 'err') : (toast('Product deleted'), list.reload())
  }

  const rows = (list.data || []).filter((p: any) => (!st || p.status === st) && `${p.title} ${p.sku || ''}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <PageHeader title="Products" sub="Published products appear on the storefront immediately."><button className="btn-primary" onClick={() => setF({ ...BLANK })}><Plus size={16} />Add product</button></PageHeader>
      <div className="mb-3 flex flex-wrap gap-2"><input className="input max-w-xs" placeholder="Search title or SKU…" value={q} onChange={e => setQ(e.target.value)} />
        <select className="input w-40" value={st} onChange={e => setSt(e.target.value)}><option value="">All statuses</option><option value="published">Published</option><option value="draft">Draft</option></select></div>
      <div className="card overflow-x-auto">
        {list.loading ? <Spinner /> : list.error ? <ErrorBox msg={list.error} /> : !rows.length ? <Empty text="No products found. Add your first product." /> : (
          <table className="w-full"><thead className="border-b border-line"><tr>{['', 'Product', 'Category', 'Price', 'Stock', 'Status', ''].map((h, i) => <th key={i} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">{rows.map((p: any) => {
              const img = (p.product_images || []).find((i: any) => i.is_primary) || p.product_images?.[0]
              const stock = (p.product_variants || []).reduce((s: number, v: any) => s + v.stock_qty, 0)
              return <tr key={p.id}>
                <td className="td">{img ? <img src={img.url} alt="" className="h-12 w-10 rounded object-cover" /> : <div className="h-12 w-10 rounded bg-paper" />}</td>
                <td className="td"><div className="font-medium">{p.title}</div><div className="text-xs text-muted">{p.sku || 'No SKU'}{p.made_to_order ? ' · made to order' : ''}</div></td>
                <td className="td">{p.categories?.name || '—'}</td>
                <td className="td">{p.sale_price != null ? <><b>{inr(p.sale_price)}</b> <s className="text-xs text-muted">{inr(p.price)}</s></> : inr(p.price)}</td>
                <td className="td">{p.made_to_order ? '—' : stock}</td>
                <td className="td"><button onClick={() => togglePublish(p)} title="Click to toggle"><Badge v={p.status} /></button></td>
                <td className="td whitespace-nowrap text-right"><button className="btn-ghost" aria-label="Edit" onClick={() => setF(toForm(p))}><Pencil size={16} /></button><button className="btn-ghost" aria-label="Delete" onClick={() => del(p)}><Trash2 size={16} /></button></td></tr>
            })}</tbody></table>
        )}
      </div>
      {f && <Modal wide title={f.id ? `Edit · ${f.title}` : 'New product'} onClose={() => { setF(null); list.reload() }}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Title *" className="sm:col-span-2"><input className="input" value={f.title} onChange={e => set('title', e.target.value)} /></Field>
          <Field label="SKU"><input className="input" value={f.sku} onChange={e => set('sku', e.target.value)} /></Field>
          <Field label="Category"><select className="input" value={f.category_id} onChange={e => set('category_id', e.target.value)}><option value="">None</option>{cats.data?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
          <Field label="Price (₹) *"><input className="input" type="number" min={0} value={f.price} onChange={e => set('price', e.target.value)} /></Field>
          <Field label="Discounted price (₹)"><input className="input" type="number" min={0} value={f.sale_price} onChange={e => set('sale_price', e.target.value)} /></Field>
          <Field label="Description" className="sm:col-span-3"><textarea rows={4} className="input" value={f.description} onChange={e => set('description', e.target.value)} /></Field>
          <Field label="Fabric"><input className="input" value={f.fabric} onChange={e => set('fabric', e.target.value)} /></Field>
          <Field label="Colours" hint="Comma separated"><input className="input" value={f.colors} onChange={e => set('colors', e.target.value)} /></Field>
          <Field label="Sizes" hint="Comma separated, e.g. S, M, L, Custom"><input className="input" value={f.sizes} onChange={e => set('sizes', e.target.value)} /></Field>
          <Field label="Occasions" hint="Comma separated"><input className="input" value={f.occasions} onChange={e => set('occasions', e.target.value)} /></Field>
          <Field label="Tags" hint="Comma separated"><input className="input" value={f.tags} onChange={e => set('tags', e.target.value)} /></Field>
          <Field label="Dispatch time (days)"><input className="input" type="number" min={0} value={f.dispatch_days} onChange={e => set('dispatch_days', e.target.value)} /></Field>
          <Field label="Delivery information" className="sm:col-span-3"><input className="input" value={f.delivery_info} onChange={e => set('delivery_info', e.target.value)} /></Field>
          <Field label="URL slug" hint="Empty = from title"><input className="input" value={f.slug} onChange={e => set('slug', e.target.value)} /></Field>
          <Field label="Status"><select className="input" value={f.status} onChange={e => set('status', e.target.value)}><option value="draft">Draft (hidden)</option><option value="published">Published</option></select></Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {([['is_featured', 'Featured'], ['is_best_seller', 'Best seller'], ['is_new_arrival', 'New arrival'], ['customizable', 'Customisation enabled'], ['made_to_order', 'Made to order (no stock limit)']] as const).map(([k, l]) => <label key={k} className="flex items-center gap-1.5"><input type="checkbox" checked={f[k]} onChange={e => set(k, e.target.checked)} />{l}</label>)}
        </div>
        <div className="mt-4 flex justify-end"><button className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : f.id ? 'Save changes' : 'Create product'}</button></div>
        {f.id ? <><Images productId={f.id} onChange={list.reload} /><Variants product={f} onChange={list.reload} /></> : <p className="mt-4 rounded-md bg-paper p-3 text-sm text-muted">Create the product first, then photos and size-wise stock can be added here.</p>}
      </Modal>}
    </>
  )
}

function Images({ productId, onChange }: { productId: string; onChange: () => void }) {
  const { data, reload } = useQuery(async () => must(await supabase.from('product_images').select('*').eq('product_id', productId).order('sort_order').order('created_at')), [productId])
  const [busy, setBusy] = useState(false)
  async function upload(files: FileList | null) {
    if (!files?.length) return
    setBusy(true); let hasPrimary = !!data?.some((i: any) => i.is_primary); let n = data?.length || 0
    for (const file of Array.from(files)) {
      const path = `products/${productId}/${crypto.randomUUID()}.${(file.name.split('.').pop() || 'jpg').toLowerCase()}`
      const up = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: '31536000' })
      if (up.error) { toast(up.error.message, 'err'); continue }
      const ins = await supabase.from('product_images').insert({ product_id: productId, url: publicUrl(path), path, is_primary: !hasPrimary, sort_order: n++ })
      if (ins.error) toast(ins.error.message, 'err'); else hasPrimary = true
    }
    setBusy(false); reload(); onChange()
  }
  async function makePrimary(id: string) {
    await supabase.from('product_images').update({ is_primary: false }).eq('product_id', productId)
    const { error } = await supabase.from('product_images').update({ is_primary: true }).eq('id', id)
    error ? toast(error.message, 'err') : (reload(), onChange())
  }
  async function remove(img: any) {
    if (img.path) await supabase.storage.from(BUCKET).remove([img.path])
    await supabase.from('product_images').delete().eq('id', img.id)
    if (img.is_primary) { const next = data?.find((i: any) => i.id !== img.id); if (next) await supabase.from('product_images').update({ is_primary: true }).eq('id', next.id) }
    reload(); onChange()
  }
  return (
    <div className="mt-6 border-t border-line pt-4"><h3 className="mb-2 text-sm font-semibold">Photos</h3>
      <div className="flex flex-wrap gap-3">
        {data?.map((i: any) => <div key={i.id} className="relative"><img src={i.url} alt="" className={`h-28 w-24 rounded object-cover ${i.is_primary ? 'ring-2 ring-wine' : 'border border-line'}`} />
          <button className="absolute right-1 top-1 rounded bg-white/90 p-1" aria-label="Remove photo" onClick={() => remove(i)}><X size={14} /></button>
          <button className={`mt-1 flex w-full items-center justify-center gap-1 text-xs ${i.is_primary ? 'text-wine' : 'text-muted hover:text-ink'}`} onClick={() => !i.is_primary && makePrimary(i.id)}><Star size={12} fill={i.is_primary ? 'currentColor' : 'none'} />{i.is_primary ? 'Primary' : 'Make primary'}</button></div>)}
        <label className="flex h-28 w-24 cursor-pointer items-center justify-center rounded border border-dashed border-line text-center text-xs text-muted hover:bg-paper">{busy ? 'Uploading…' : '+ Add photos'}<input type="file" accept="image/*" multiple hidden disabled={busy} onChange={e => { upload(e.target.files); e.target.value = '' }} /></label>
      </div></div>
  )
}

function Variants({ product, onChange }: { product: any; onChange: () => void }) {
  const { data, reload } = useQuery(async () => must(await supabase.from('product_variants').select('*').eq('product_id', product.id).order('created_at')), [product.id])
  const [n, setN] = useState({ size: '', color: '', stock: '' })
  async function add() {
    if (!n.size.trim()) return toast('Size is required', 'err')
    const { data: v, error } = await supabase.from('product_variants').insert({ product_id: product.id, size: n.size.trim(), color: n.color.trim() || null }).select().single()
    if (error) return toast(error.message.includes('duplicate') ? 'That size/colour already exists' : error.message, 'err')
    if (Number(n.stock) > 0) { const r = await supabase.rpc('adjust_stock', { p_variant: v.id, p_type: 'stock_in', p_qty: Number(n.stock), p_note: 'Opening stock' }); if (r.error) toast(r.error.message, 'err') }
    setN({ size: '', color: '', stock: '' }); reload(); onChange()
  }
  async function remove(id: string) { if (!confirm('Delete this variant?')) return; const { error } = await supabase.from('product_variants').delete().eq('id', id); error ? toast(error.message, 'err') : (reload(), onChange()) }
  return (
    <div className="mt-6 border-t border-line pt-4"><h3 className="mb-1 text-sm font-semibold">Variants and stock</h3>
      <p className="mb-2 text-xs text-muted">Stock changes after creation are made in Inventory so every movement is logged.</p>
      {data?.length ? <table className="mb-3 w-full"><tbody className="divide-y divide-line">{data.map((v: any) => <tr key={v.id}><td className="td">{v.size}</td><td className="td">{v.color || '—'}</td><td className="td">{v.stock_qty} in stock</td><td className="td text-right"><button className="btn-ghost" aria-label="Delete variant" onClick={() => remove(v.id)}><Trash2 size={15} /></button></td></tr>)}</tbody></table> : <p className="mb-3 text-sm text-muted">No variants yet.</p>}
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Size"><input className="input w-28" list="sizes" value={n.size} onChange={e => setN({ ...n, size: e.target.value })} /></Field><datalist id="sizes">{(product.sizes ? csvList(product.sizes) : []).map((s: string) => <option key={s} value={s} />)}</datalist>
        <Field label="Colour (optional)"><input className="input w-32" value={n.color} onChange={e => setN({ ...n, color: e.target.value })} /></Field>
        <Field label="Opening stock"><input className="input w-24" type="number" min={0} value={n.stock} onChange={e => setN({ ...n, stock: e.target.value })} /></Field>
        <button className="btn" onClick={add}><Plus size={15} />Add variant</button></div></div>
  )
}

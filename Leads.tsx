import { useEffect, useState } from 'react'
import { MessageCircle, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useQuery, must } from '../lib/hooks'
import { fdt, fdate, lbl, toast, waLink, toLocalInput, fromLocalInput, LEAD_STATUSES, LEAD_SOURCES } from '../lib/utils'
import { Badge, Empty, ErrorBox, Field, Modal, PageHeader, Spinner } from '../components/ui'

const BLANK = { name: '', phone: '', email: '', product_interest: '', occasion: '', budget: '', required_date: '', description: '', source: 'manual', status: 'new' }

export default function Leads() {
  const [q, setQ] = useState(''); const [st, setSt] = useState(''); const [src, setSrc] = useState(''); const [open, setOpen] = useState<any>(null)
  const { data, loading, error, reload } = useQuery(async () => {
    let r = supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(500)
    if (st) r = r.eq('status', st); if (src) r = r.eq('source', src)
    if (q.trim()) { const s = q.trim().replace(/[,()]/g, ' '); r = r.or(`name.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%,product_interest.ilike.%${s}%`) }
    return must(await r)
  }, [q, st, src])
  return (
    <>
      <PageHeader title="Leads & inquiries" sub="Custom design requests, product and wedding inquiries, contact forms and newsletter sign-ups."><button className="btn-primary" onClick={() => setOpen({ ...BLANK })}><Plus size={16} />Add lead</button></PageHeader>
      <div className="mb-3 grid gap-2 sm:grid-cols-4">
        <input className="input sm:col-span-2" placeholder="Search name, phone, email, product…" value={q} onChange={e => setQ(e.target.value)} />
        <select className="input" value={st} onChange={e => setSt(e.target.value)}><option value="">All statuses</option>{LEAD_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select className="input" value={src} onChange={e => setSrc(e.target.value)}><option value="">All sources</option>{LEAD_SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      </div>
      <div className="card overflow-x-auto">
        {loading ? <Spinner /> : error ? <ErrorBox msg={error} /> : !data?.length ? <Empty text="No leads match these filters" /> : (
          <table className="w-full"><thead className="border-b border-line"><tr>{['Received', 'Name', 'Interested in', 'Occasion', 'Needed by', 'Source', 'Follow-up', 'Status', ''].map(h => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody className="divide-y divide-line">{data.map((l: any) => <tr key={l.id}><td className="td text-muted">{fdt(l.created_at)}</td><td className="td font-medium">{l.name}<div className="text-xs font-normal text-muted">{l.phone || l.email}</div></td><td className="td">{l.product_interest || '—'}</td><td className="td">{l.occasion || '—'}</td><td className="td">{fdate(l.required_date)}</td><td className="td">{lbl(LEAD_SOURCES, l.source)}</td>
              <td className="td">{l.follow_up_at ? <span className={new Date(l.follow_up_at) < new Date() && !['converted', 'closed', 'not_interested'].includes(l.status) ? 'font-medium text-red-700' : ''}>{fdt(l.follow_up_at)}</span> : '—'}</td><td className="td"><Badge v={l.status} text={lbl(LEAD_STATUSES, l.status)} /></td><td className="td text-right"><button className="btn" onClick={() => setOpen(l)}>Open</button></td></tr>)}</tbody></table>
        )}
      </div>
      {open && <LeadModal lead={open} onClose={() => { setOpen(null); reload() }} />}
    </>
  )
}

function LeadModal({ lead, onClose }: { lead: any; onClose: () => void }) {
  const isNew = !lead.id
  const [f, setF] = useState<any>({ ...lead, required_date: lead.required_date || '', follow_up_at: toLocalInput(lead.follow_up_at) })
  const [id, setId] = useState<string | null>(lead.id || null)
  const [busy, setBusy] = useState(false); const [note, setNote] = useState(''); const [amount, setAmount] = useState(''); const [img, setImg] = useState<string | null>(null)
  const notes = useQuery(async () => id ? must(await supabase.from('lead_notes').select('*').eq('lead_id', id).order('created_at', { ascending: false })) : [], [id])
  const set = (k: string, v: any) => setF((x: any) => ({ ...x, [k]: v }))
  useEffect(() => {
    const u = lead.reference_image_url; if (!u) return
    if (/^https?:/.test(u)) setImg(u)
    else supabase.storage.from('lead-references').createSignedUrl(u, 3600).then(({ data }) => setImg(data?.signedUrl || null))
  }, [])

  const payload = () => ({ name: f.name.trim(), phone: f.phone || null, email: f.email || null, product_interest: f.product_interest || null, occasion: f.occasion || null, budget: f.budget || null, required_date: f.required_date || null, description: f.description || null, source: f.source, status: f.status, follow_up_at: fromLocalInput(f.follow_up_at) })
  async function save() {
    if (!f.name.trim()) return toast('Name is required', 'err')
    setBusy(true)
    const r = id ? await supabase.from('leads').update(payload()).eq('id', id) : await supabase.from('leads').insert(payload()).select().single()
    setBusy(false)
    if (r.error) return toast(r.error.message, 'err')
    if (!id) setId((r.data as any).id)
    toast('Lead saved'); notes.reload()
  }
  async function addNote() {
    if (!note.trim() || !id) return
    const { error } = await supabase.from('lead_notes').insert({ lead_id: id, note: note.trim(), kind: 'note' })
    error ? toast(error.message, 'err') : (setNote(''), notes.reload())
  }
  async function convert() {
    const amt = Number(amount)
    if (!id || !(amt > 0)) return toast('Enter the agreed amount first', 'err')
    if (!confirm(`Create an order of ₹${amt} for ${f.name}?`)) return
    setBusy(true)
    const o = await supabase.from('orders').insert({ customer_id: lead.customer_id || null, customer_name: f.name, phone: f.phone || null, email: f.email || null, status: 'new', payment_status: 'pending', payment_method: 'manual', subtotal: amt, total: amt, shipping_address: {} }).select().single()
    if (o.error) { setBusy(false); return toast(o.error.message, 'err') }
    const it = await supabase.from('order_items').insert({ order_id: o.data.id, title: f.product_interest || 'Custom outfit', qty: 1, unit_price: amt, customization: { occasion: f.occasion, budget: f.budget, required_by: f.required_date, notes: f.description, measurements: lead.measurements, preferred_size: lead.preferred_size, preferred_color: lead.preferred_color } })
    if (it.error) { setBusy(false); return toast(it.error.message, 'err') }
    const l = await supabase.from('leads').update({ status: 'converted', converted_order_id: o.data.id }).eq('id', id)
    setBusy(false)
    if (l.error) return toast(l.error.message, 'err')
    toast(`Order ${o.data.order_number} created. Add the delivery address from Orders.`); onClose()
  }
  return (
    <Modal wide title={isNew && !id ? 'Add lead' : `Lead · ${f.name}`} onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Name *"><input className="input" value={f.name} onChange={e => set('name', e.target.value)} /></Field>
        <Field label="Phone"><input className="input" value={f.phone || ''} onChange={e => set('phone', e.target.value)} /></Field>
        <Field label="Email"><input className="input" type="email" value={f.email || ''} onChange={e => set('email', e.target.value)} /></Field>
        <Field label="Product interested in"><input className="input" value={f.product_interest || ''} onChange={e => set('product_interest', e.target.value)} /></Field>
        <Field label="Occasion"><input className="input" value={f.occasion || ''} onChange={e => set('occasion', e.target.value)} /></Field>
        <Field label="Budget"><input className="input" value={f.budget || ''} onChange={e => set('budget', e.target.value)} /></Field>
        <Field label="Required by"><input type="date" className="input" value={f.required_date} onChange={e => set('required_date', e.target.value)} /></Field>
        <Field label="Source"><select className="input" value={f.source} onChange={e => set('source', e.target.value)}>{LEAD_SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <Field label="Status"><select className="input" value={f.status} onChange={e => set('status', e.target.value)}>{LEAD_STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <Field label="Schedule follow-up"><input type="datetime-local" className="input" value={f.follow_up_at} onChange={e => set('follow_up_at', e.target.value)} /></Field>
        <Field label="Description" className="sm:col-span-2"><textarea rows={3} className="input" value={f.description || ''} onChange={e => set('description', e.target.value)} /></Field>
      </div>
      {(lead.measurements || lead.preferred_size || lead.preferred_color || img) && (
        <div className="mt-3 rounded-md bg-paper p-3 text-sm"><b>Custom request details</b>
          {lead.preferred_size && <div>Preferred size: {lead.preferred_size}</div>}{lead.preferred_color && <div>Preferred colour: {lead.preferred_color}</div>}
          {lead.measurements && <div>Measurements: {Object.entries(lead.measurements).map(([k, v]) => `${k} ${v}`).join(' · ')}</div>}
          {img && <a href={img} target="_blank" rel="noreferrer"><img src={img} alt="Reference" className="mt-2 max-h-48 rounded" /></a>}</div>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        {f.phone ? <a className="btn" href={waLink(f.phone, `Hello ${f.name}, this is PARQH regarding your inquiry.`)} target="_blank" rel="noreferrer"><MessageCircle size={15} />WhatsApp</a> : <span />}
        <button className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : id ? 'Save changes' : 'Create lead'}</button>
      </div>
      {id && <>
        <div className="mt-5 border-t border-line pt-4"><h3 className="mb-2 text-sm font-semibold">Notes and history</h3>
          <div className="mb-3 flex gap-2"><input className="input" placeholder="Add an internal note…" value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNote()} /><button className="btn" onClick={addNote}>Add note</button></div>
          {!notes.data?.length ? <p className="text-sm text-muted">No notes yet.</p> : <ol className="space-y-1 text-sm">{notes.data.map((n: any) => <li key={n.id} className="flex gap-3"><span className="w-28 shrink-0 text-muted">{fdt(n.created_at)}</span><span className={n.kind === 'status_change' ? 'text-muted' : ''}>{n.note}</span></li>)}</ol>}</div>
        {!lead.converted_order_id && f.status !== 'converted' && <div className="mt-5 flex flex-wrap items-end gap-2 border-t border-line pt-4"><Field label="Convert to order · agreed amount (₹)"><input className="input w-40" type="number" min={1} value={amount} onChange={e => setAmount(e.target.value)} /></Field><button className="btn" disabled={busy} onClick={convert}>Convert to order</button></div>}
      </>}
    </Modal>
  )
}

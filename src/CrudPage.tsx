import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useQuery, must } from '../lib/hooks'
import { toast, toLocalInput, fromLocalInput } from '../lib/utils'
import { Modal, Field, PageHeader, Empty, Spinner, ErrorBox } from './ui'
import ImageInput from './ImageInput'

export type F = { key: string; label: string; type?: 'text' | 'number' | 'checkbox' | 'date' | 'datetime' | 'textarea' | 'select' | 'image'; options?: [string, string][]; hint?: string; required?: boolean }
type Col = { key: string; label: string; render?: (row: any) => any }

export default function CrudPage({ title, sub, table, fields, columns, defaults, order = 'created_at', asc = false, beforeSave, noun }: {
  title: string; sub?: string; table: string; fields: F[]; columns: Col[]; defaults: any; order?: string; asc?: boolean; beforeSave?: (p: any) => any; noun: string
}) {
  const { data, loading, error, reload } = useQuery(async () => must(await supabase.from(table).select('*').order(order, { ascending: asc })), [table])
  const [edit, setEdit] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    const missing = fields.find(f => f.required && (edit[f.key] === '' || edit[f.key] == null))
    if (missing) return toast(`${missing.label} is required`, 'err')
    let p: any = {}
    for (const f of fields) {
      let v = edit[f.key]
      if (f.type === 'number') v = v === '' || v == null ? null : Number(v)
      else if (f.type === 'datetime') v = fromLocalInput(v)
      else if (v === '' && (f.type === 'date')) v = null
      p[f.key] = v
    }
    if (beforeSave) p = beforeSave(p)
    setBusy(true)
    const res = edit.id ? await supabase.from(table).update(p).eq('id', edit.id) : await supabase.from(table).insert(p)
    setBusy(false)
    if (res.error) return toast(res.error.message, 'err')
    toast('Saved'); setEdit(null); reload()
  }
  async function del(r: any) {
    if (!confirm(`Delete this ${noun}? This cannot be undone.`)) return
    const { error } = await supabase.from(table).delete().eq('id', r.id)
    if (error) return toast(error.message, 'err')
    toast('Deleted'); reload()
  }
  const set = (k: string, v: any) => setEdit((e: any) => ({ ...e, [k]: v }))

  return (
    <>
      <PageHeader title={title} sub={sub}><button className="btn-primary" onClick={() => setEdit({ ...defaults })}><Plus size={16} />Add {noun}</button></PageHeader>
      <div className="card overflow-x-auto">
        {loading ? <Spinner /> : error ? <ErrorBox msg={error} /> : !data?.length ? <Empty text={`No ${noun}s yet. Add your first one.`} /> : (
          <table className="w-full">
            <thead className="border-b border-line"><tr>{columns.map(c => <th key={c.key} className="th">{c.label}</th>)}<th className="th" /></tr></thead>
            <tbody className="divide-y divide-line">
              {data.map((r: any) => (
                <tr key={r.id}>
                  {columns.map(c => <td key={c.key} className="td">{c.render ? c.render(r) : String(r[c.key] ?? '—')}</td>)}
                  <td className="td whitespace-nowrap text-right">
                    <button className="btn-ghost" aria-label="Edit" onClick={() => setEdit({ ...r, ...Object.fromEntries(fields.filter(f => f.type === 'datetime').map(f => [f.key, toLocalInput(r[f.key])])) })}><Pencil size={16} /></button>
                    <button className="btn-ghost" aria-label="Delete" onClick={() => del(r)}><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {edit && (
        <Modal title={`${edit.id ? 'Edit' : 'Add'} ${noun}`} onClose={() => setEdit(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map(f => (
              <Field key={f.key} label={f.label + (f.required ? ' *' : '')} hint={f.hint} className={f.type === 'textarea' || f.type === 'image' ? 'sm:col-span-2' : ''}>
                {f.type === 'checkbox' ? <input type="checkbox" checked={!!edit[f.key]} onChange={e => set(f.key, e.target.checked)} />
                  : f.type === 'textarea' ? <textarea className="input" rows={3} value={edit[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} />
                  : f.type === 'select' ? <select className="input" value={edit[f.key] ?? ''} onChange={e => set(f.key, e.target.value)}>{f.options!.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                  : f.type === 'image' ? <ImageInput value={edit[f.key]} onChange={u => set(f.key, u)} folder={table} />
                  : <input className="input" type={f.type === 'datetime' ? 'datetime-local' : f.type || 'text'} value={edit[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} />}
              </Field>
            ))}
          </div>
          <div className="mt-5 flex justify-end gap-2"><button className="btn" onClick={() => setEdit(null)}>Cancel</button><button className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</button></div>
        </Modal>
      )}
    </>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from '../lib/utils'
import { Field, Spinner } from './ui'

export type SF = { key: string; label: string; type?: 'text' | 'number' | 'checkbox' | 'textarea'; hint?: string }
export default function SettingsForm({ title, fields }: { title: string; fields: SF[] }) {
  const [vals, setVals] = useState<Record<string, any> | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    supabase.from('website_settings').select('key,value').in('key', fields.map(f => f.key)).then(({ data, error }) => {
      if (error) { toast(error.message, 'err'); setVals({}); return }
      setVals(Object.fromEntries((data || []).map((r: any) => [r.key, r.value])))
    })
  }, [])
  async function save() {
    setBusy(true)
    const rows = fields.map(f => {
      let v = vals![f.key]
      if (f.type === 'number') v = v === '' || v == null ? 0 : Number(v)
      if (f.type === 'checkbox') v = !!v
      if (v === undefined) v = f.type === 'checkbox' ? false : ''
      return { key: f.key, value: v, updated_at: new Date().toISOString() }
    })
    const { error } = await supabase.from('website_settings').upsert(rows)
    setBusy(false)
    error ? toast(error.message, 'err') : toast('Settings saved')
  }
  if (!vals) return <Spinner />
  return (
    <div className="card mb-5 p-5">
      <h2 className="mb-3 font-semibold">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map(f => (
          <Field key={f.key} label={f.label} hint={f.hint} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
            {f.type === 'checkbox' ? <input type="checkbox" checked={!!vals[f.key]} onChange={e => setVals({ ...vals, [f.key]: e.target.checked })} />
              : f.type === 'textarea' ? <textarea rows={3} className="input" value={vals[f.key] ?? ''} onChange={e => setVals({ ...vals, [f.key]: e.target.value })} />
              : <input className="input" type={f.type || 'text'} value={vals[f.key] ?? ''} onChange={e => setVals({ ...vals, [f.key]: e.target.value })} />}
          </Field>
        ))}
      </div>
      <div className="mt-4 flex justify-end"><button className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</button></div>
    </div>
  )
}

import { useState } from 'react'
import { supabase, BUCKET, publicUrl } from '../lib/supabase'
import { toast } from '../lib/utils'
export default function ImageInput({ value, onChange, folder = 'site' }: { value?: string; onChange: (url: string) => void; folder?: string }) {
  const [busy, setBusy] = useState(false)
  async function pick(f?: File) {
    if (!f) return
    setBusy(true)
    const path = `${folder}/${crypto.randomUUID()}.${(f.name.split('.').pop() || 'jpg').toLowerCase()}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, f, { cacheControl: '31536000' })
    setBusy(false)
    if (error) return toast(error.message, 'err')
    onChange(publicUrl(path))
  }
  return (
    <div className="flex items-center gap-3">
      {value ? <img src={value} alt="" className="h-16 w-16 rounded border border-line object-cover" /> : <div className="h-16 w-16 rounded border border-dashed border-line" />}
      <input type="file" accept="image/*" disabled={busy} onChange={e => pick(e.target.files?.[0])} className="text-xs" />
      {busy && <span className="text-xs text-muted">Uploading…</span>}
    </div>
  )
}

export const inr = (n: any) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(n || 0))
export const fdate = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
export const fdt = (d?: string | null) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'
export const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
export const csvList = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean)
export const toLocalInput = (iso?: string | null) => { if (!iso) return ''; const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16) }
export const fromLocalInput = (v: string) => v ? new Date(v).toISOString() : null

export const ORDER_STATUSES: [string, string][] = [['new', 'New order'], ['confirmed', 'Confirmed'], ['processing', 'Processing'], ['production', 'Stitching / production'], ['quality_check', 'Quality check'], ['ready_to_ship', 'Ready to ship'], ['shipped', 'Shipped'], ['out_for_delivery', 'Out for delivery'], ['delivered', 'Delivered'], ['cancelled', 'Cancelled'], ['returned', 'Returned']]
export const LEAD_STATUSES: [string, string][] = [['new', 'New'], ['contacted', 'Contacted'], ['interested', 'Interested'], ['quotation_sent', 'Quotation sent'], ['follow_up', 'Follow-up required'], ['converted', 'Converted'], ['not_interested', 'Not interested'], ['closed', 'Closed']]
export const LEAD_SOURCES: [string, string][] = [['contact_form', 'Contact form'], ['product_inquiry', 'Product inquiry'], ['whatsapp', 'WhatsApp'], ['custom_design', 'Custom design'], ['wedding_inquiry', 'Wedding inquiry'], ['newsletter', 'Newsletter'], ['manual', 'Added manually']]
export const PAY_STATUSES: [string, string][] = [['pending', 'Pending'], ['paid', 'Paid'], ['failed', 'Failed'], ['refunded', 'Refunded'], ['partially_refunded', 'Partially refunded']]
export const lbl = (list: [string, string][], v?: string | null) => list.find(x => x[0] === v)?.[1] ?? v ?? '—'

export function waLink(phone?: string | null, text = '') {
  let d = (phone || '').replace(/\D/g, '')
  if (d.length === 10) d = '91' + d
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}
export function downloadCSV(name: string, rows: Record<string, any>[]) {
  if (!rows.length) { toast('Nothing to export yet', 'err'); return }
  const keys = Object.keys(rows[0])
  const esc = (v: any) => { const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => esc(r[k])).join(','))].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click(); URL.revokeObjectURL(a.href)
}
let listener: ((m: string, t: string) => void) | null = null
export const onToast = (fn: typeof listener) => { listener = fn }
export const toast = (m: string, t: 'ok' | 'err' = 'ok') => listener?.(m, t)

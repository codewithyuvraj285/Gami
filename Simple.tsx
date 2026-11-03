import CrudPage from '../components/CrudPage'
import { Badge } from '../components/ui'
import { slugify, inr, fdate } from '../lib/utils'

export const Categories = () => (
  <CrudPage title="Categories" sub="Shown on the storefront. Inactive categories are hidden." table="categories" noun="category" order="sort_order" asc
    defaults={{ name: '', slug: '', image_url: '', sort_order: 0, is_active: true }}
    beforeSave={p => ({ ...p, slug: p.slug || slugify(p.name) })}
    fields={[
      { key: 'name', label: 'Name', required: true }, { key: 'slug', label: 'URL slug', hint: 'Leave empty to generate from the name' },
      { key: 'image_url', label: 'Image', type: 'image' }, { key: 'sort_order', label: 'Sort order', type: 'number' }, { key: 'is_active', label: 'Active', type: 'checkbox' }
    ]}
    columns={[
      { key: 'image_url', label: '', render: r => r.image_url ? <img src={r.image_url} alt="" className="h-10 w-10 rounded object-cover" /> : null },
      { key: 'name', label: 'Name' }, { key: 'slug', label: 'Slug' }, { key: 'sort_order', label: 'Order' },
      { key: 'is_active', label: 'Status', render: r => <Badge v={r.is_active ? 'active' : 'inactive'} /> }
    ]} />
)

export const Coupons = () => (
  <CrudPage title="Coupons" table="coupons" noun="coupon"
    defaults={{ code: '', type: 'percent', value: '', min_order_value: 0, expires_at: '', usage_limit: '', is_active: true }}
    beforeSave={p => ({ ...p, code: String(p.code).trim().toUpperCase() })}
    fields={[
      { key: 'code', label: 'Code', required: true }, { key: 'type', label: 'Discount type', type: 'select', options: [['percent', 'Percentage (%)'], ['fixed', 'Fixed amount (₹)']] },
      { key: 'value', label: 'Value', type: 'number', required: true }, { key: 'min_order_value', label: 'Minimum order value (₹)', type: 'number' },
      { key: 'expires_at', label: 'Expires on', type: 'datetime' }, { key: 'usage_limit', label: 'Usage limit', type: 'number', hint: 'Empty = unlimited' },
      { key: 'is_active', label: 'Active', type: 'checkbox' }
    ]}
    columns={[
      { key: 'code', label: 'Code', render: r => <b>{r.code}</b> },
      { key: 'value', label: 'Discount', render: r => r.type === 'percent' ? `${r.value}%` : inr(r.value) },
      { key: 'min_order_value', label: 'Min order', render: r => inr(r.min_order_value) },
      { key: 'expires_at', label: 'Expires', render: r => fdate(r.expires_at) },
      { key: 'used_count', label: 'Used', render: r => `${r.used_count}${r.usage_limit ? ' / ' + r.usage_limit : ''}` },
      { key: 'is_active', label: 'Status', render: r => <Badge v={r.is_active ? 'active' : 'inactive'} /> }
    ]} />
)

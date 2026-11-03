import CrudPage from '../components/CrudPage'
import SettingsForm from '../components/SettingsForm'
import { Badge, PageHeader } from '../components/ui'

export default function Content() {
  return (
    <>
      <PageHeader title="Website content" sub="Banners and text the storefront reads from the database. Featured products, best sellers and new arrivals are flagged in Products." />
      <SettingsForm title="Announcement bar" fields={[{ key: 'announcement_text', label: 'Announcement text' }, { key: 'announcement_enabled', label: 'Show announcement', type: 'checkbox' }]} />
      <SettingsForm title="About section" fields={[{ key: 'about_title', label: 'Heading' }, { key: 'about_text', label: 'Brand story', type: 'textarea' }]} />
      <SettingsForm title="Contact information and social links" fields={[
        { key: 'contact_phone', label: 'Phone' }, { key: 'contact_email', label: 'Email' }, { key: 'contact_address', label: 'Address', type: 'textarea' },
        { key: 'social_instagram', label: 'Instagram URL' }, { key: 'social_facebook', label: 'Facebook URL' }, { key: 'social_youtube', label: 'YouTube URL' }, { key: 'footer_text', label: 'Footer text', type: 'textarea' }
      ]} />
      <div className="mt-6" />
      <CrudPage title="Banners" sub="Hero and promotional banners" table="banners" noun="banner" order="sort_order" asc
        defaults={{ title: '', subtitle: '', image_url: '', link_url: '', placement: 'hero', sort_order: 0, is_active: true }}
        fields={[
          { key: 'title', label: 'Title' }, { key: 'subtitle', label: 'Subtitle' }, { key: 'image_url', label: 'Image', type: 'image' }, { key: 'link_url', label: 'Link' },
          { key: 'placement', label: 'Placement', type: 'select', options: [['hero', 'Homepage hero'], ['promo', 'Promotional'], ['category', 'Featured category']] },
          { key: 'sort_order', label: 'Sort order', type: 'number' }, { key: 'is_active', label: 'Active', type: 'checkbox' }
        ]}
        columns={[
          { key: 'image_url', label: '', render: r => r.image_url ? <img src={r.image_url} alt="" className="h-12 w-20 rounded object-cover" /> : null },
          { key: 'title', label: 'Title' }, { key: 'placement', label: 'Placement' }, { key: 'sort_order', label: 'Order' },
          { key: 'is_active', label: 'Status', render: r => <Badge v={r.is_active ? 'active' : 'inactive'} /> }
        ]} />
    </>
  )
}

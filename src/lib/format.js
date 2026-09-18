export const rupiah = (value = 0) => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
}).format(Number(value || 0))

export const compactNumber = (value = 0) => new Intl.NumberFormat('id-ID', {
  notation: 'compact', maximumFractionDigits: 1,
}).format(Number(value || 0))

export const slugify = (value = '') => value.toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export const asArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean)
  if (!value) return []
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter(Boolean) : [] }
  catch { return String(value).split(/\n|,/).map(v => v.trim()).filter(Boolean) }
}

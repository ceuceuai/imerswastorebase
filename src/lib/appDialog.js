let installed = false
let active = false
const queue = []

const icons = {
  success: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
  danger: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v4m0 4h.01M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>',
  warning: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v4m0 4h.01M10.3 3.9 2.6 17.2A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>',
  info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></svg>',
  question: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.4 2.4 0 1 1 3.8 1.95c-.9.62-1.6 1.16-1.6 2.55M12 17h.01"/></svg>',
}

function autoType(message='') {
  const s = String(message).toLowerCase()
  if (/(berhasil|sukses|tersimpan|aktif|terhubung)/.test(s)) return 'success'
  if (/(gagal|error|ditolak|tidak ditemukan|tidak valid)/.test(s)) return 'danger'
  if (/(wajib|belum|peringatan|hati-hati)/.test(s)) return 'warning'
  return 'info'
}

function titleFor(type) {
  return ({success:'Berhasil', danger:'Terjadi Masalah', warning:'Perlu Perhatian', question:'Konfirmasi', info:'Informasi'})[type] || 'Informasi'
}

function enqueue(options) {
  return new Promise(resolve => {
    queue.push({options, resolve})
    runNext()
  })
}

function runNext() {
  if (active || !queue.length || typeof document === 'undefined') return
  active = true
  const {options, resolve} = queue.shift()
  const type = options.type || autoType(options.message)
  const root = document.createElement('div')
  root.className = 'imers-dialog-root'
  root.innerHTML = `
    <div class="imers-dialog-backdrop" data-close="backdrop"></div>
    <section class="imers-dialog-card imers-dialog-${type}" role="dialog" aria-modal="true" aria-labelledby="imers-dialog-title">
      <button class="imers-dialog-x" type="button" aria-label="Tutup">×</button>
      <div class="imers-dialog-icon">${icons[type] || icons.info}</div>
      <div class="imers-dialog-copy">
        <span class="imers-dialog-eyebrow">iMersWAStore</span>
        <h3 id="imers-dialog-title">${escapeHtml(options.title || titleFor(type))}</h3>
        <p>${escapeHtml(options.message || '').replace(/\n/g,'<br>')}</p>
      </div>
      ${options.mode === 'prompt' ? `<div class="imers-dialog-input-wrap"><input class="imers-dialog-input" type="text" value="${escapeAttr(options.defaultValue || '')}" placeholder="${escapeAttr(options.placeholder || '')}"></div>` : ''}
      <div class="imers-dialog-actions">
        ${options.mode === 'confirm' || options.mode === 'prompt' ? `<button type="button" class="imers-dialog-btn ghost" data-action="cancel">${escapeHtml(options.cancelText || 'Batal')}</button>` : ''}
        <button type="button" class="imers-dialog-btn primary ${type === 'danger' ? 'danger' : ''}" data-action="ok">${escapeHtml(options.okText || 'OK')}</button>
      </div>
    </section>`
  document.body.appendChild(root)
  requestAnimationFrame(()=>root.classList.add('show'))
  const input = root.querySelector('.imers-dialog-input')
  const finish = value => {
    root.classList.remove('show')
    setTimeout(()=>root.remove(), 180)
    active = false
    resolve(value)
    setTimeout(runNext, 190)
  }
  root.querySelector('[data-action="ok"]').addEventListener('click', ()=>finish(options.mode === 'prompt' ? input.value : true))
  root.querySelector('[data-action="cancel"]')?.addEventListener('click', ()=>finish(options.mode === 'prompt' ? null : false))
  root.querySelector('.imers-dialog-x').addEventListener('click', ()=>finish(options.mode === 'prompt' ? null : options.mode === 'confirm' ? false : true))
  root.querySelector('[data-close="backdrop"]').addEventListener('click', ()=>finish(options.mode === 'prompt' ? null : options.mode === 'confirm' ? false : true))
  const onKey = e => {
    if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); finish(options.mode === 'prompt' ? null : options.mode === 'confirm' ? false : true) }
    if (e.key === 'Enter' && options.mode === 'prompt') { document.removeEventListener('keydown', onKey); finish(input.value) }
  }
  document.addEventListener('keydown', onKey)
  setTimeout(()=> (input || root.querySelector('[data-action="ok"]'))?.focus(), 30)
}

function escapeHtml(value='') { return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])) }
function escapeAttr(value='') { return escapeHtml(value) }

export function appAlert(message, options={}) {
  return enqueue({mode:'alert', message:String(message ?? ''), ...options})
}

export function appConfirm(message, options={}) {
  return enqueue({mode:'confirm', type: options.type || 'question', message:String(message ?? ''), okText:'Ya, Lanjutkan', cancelText:'Batal', ...options})
}

export function appPrompt(message, options={}) {
  return enqueue({mode:'prompt', type:'info', message:String(message ?? ''), okText:'Gunakan', cancelText:'Batal', ...options})
}

export function installAppDialogs() {
  if (installed || typeof window === 'undefined') return
  installed = true
  window.__nativeAlert = window.alert.bind(window)
  window.alert = (message) => { appAlert(message); }
  window.imersAlert = appAlert
  window.imersConfirm = appConfirm
  window.imersPrompt = appPrompt
}

import { appPrompt } from '../lib/appDialog'
import { useEffect, useRef } from 'react'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'

const TOOLBAR = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ align: [] }],
  ['blockquote', 'link', 'image'],
  ['clean'],
]

export default function QuillEditor({ value = '', onChange, placeholder = 'Tulis isi artikel...' }) {
  const hostRef = useRef(null)
  const quillRef = useRef(null)
  const onChangeRef = useRef(onChange)
  const syncingRef = useRef(false)

  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  useEffect(() => {
    if (!hostRef.current || quillRef.current) return

    const quill = new Quill(hostRef.current, {
      theme: 'snow',
      placeholder,
      modules: {
        toolbar: {
          container: TOOLBAR,
          handlers: {
            async image() {
              const url = await appPrompt('Masukkan URL gambar (https://...)', { title: 'Tambahkan Gambar', placeholder: 'https://...' })
              if (!url) return
              const range = quill.getSelection(true)
              quill.insertEmbed(range.index, 'image', url, 'user')
              quill.setSelection(range.index + 1, 0, 'silent')
            },
          },
        },
      },
    })

    quillRef.current = quill
    if (value) {
      syncingRef.current = true
      quill.clipboard.dangerouslyPasteHTML(value)
      syncingRef.current = false
    }

    const handleChange = () => {
      if (syncingRef.current) return
      const html = quill.root.innerHTML
      const normalized = html === '<p><br></p>' ? '' : html
      onChangeRef.current?.(normalized)
    }

    quill.on('text-change', handleChange)
    return () => {
      quill.off('text-change', handleChange)
      quillRef.current = null
      if (hostRef.current) hostRef.current.innerHTML = ''
    }
  }, [])

  useEffect(() => {
    const quill = quillRef.current
    if (!quill) return
    const current = quill.root.innerHTML === '<p><br></p>' ? '' : quill.root.innerHTML
    const next = value || ''
    if (current === next) return
    syncingRef.current = true
    quill.clipboard.dangerouslyPasteHTML(next)
    syncingRef.current = false
  }, [value])

  return <div className="quill-editor-wrap"><div ref={hostRef} /></div>
}

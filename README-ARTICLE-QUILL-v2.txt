iMersWAStore Base - Article/Blog Rich Text Editor v2

STATUS:
- Mengganti textarea artikel lama dengan Quill 2 rich text editor.
- Toolbar: Heading H1/H2/H3, Bold, Italic, Underline, Strike, text/background color,
  ordered/bullet list, alignment, blockquote, hyperlink, image URL, clear formatting.
- Isi artikel disimpan sebagai HTML di kolom articles.content yang sudah ada.
- Render artikel memakai DOMPurify agar HTML yang tampil disanitasi.
- Konten lama/plain text dan format hyperlink lama masih tetap dibaca.

TIDAK PERLU SQL BARU untuk Quill.
Tetap jalankan Step 19 Article & Blog Module jika tabel articles belum dibuat.

Untuk GitHub:
1. Upload/replace file HOTFIX ke root repository.
2. Pastikan package.json ikut ter-replace agar dependency quill + dompurify terpasang.
3. Commit.
4. Vercel akan redeploy otomatis.

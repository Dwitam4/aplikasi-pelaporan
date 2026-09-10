# Aplikasi Pelaporan Spreadsheet

Aplikasi pencatatan operasional transportasi, penumpang, driver, armada, ekspor spreadsheet, dan pemindaian formulir dengan AI.

## Database online Supabase

Di hosting, aplikasi menggunakan **Supabase PostgreSQL** melalui environment variable `DATABASE_URL`. Tabel `reports` dan `app_documents` dibuat otomatis saat server pertama kali dijalankan. Saat dijalankan tanpa `DATABASE_URL`, aplikasi memakai SQLite lokal sebagai fallback.

## Menjalankan lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`. Untuk produksi: `npm run build && npm start`.

## Deploy Render

- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Environment: `NODE_ENV=production`, `DATABASE_URL=<Supabase connection string>`
- Opsional: `GEMINI_API_KEY=<kunci Gemini>` untuk fitur AI scan.

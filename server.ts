import express, { Response } from "express";
import path from "path";
import fs from "fs";
import { DatabaseSync } from "node:sqlite";
import pg from "pg";
const { Pool } = pg;
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Hosted PostgreSQL (Supabase) with SQLite fallback for local development.
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const localDb = new DatabaseSync(path.join(DATA_DIR, "pelaporan.sqlite"));
localDb.exec(`PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS app_documents (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL);`);
const hostedDb = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 5 }) : null;
const usingSupabase = Boolean(hostedDb);
const now = () => new Date().toISOString();
const readJson = <T>(value: string | undefined, fallback: T): T => { try { return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } };
async function initDatabase() {
  if (hostedDb) {
    await hostedDb.query(`CREATE TABLE IF NOT EXISTS app_documents (key TEXT PRIMARY KEY, value JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()); CREATE TABLE IF NOT EXISTS reports (id TEXT PRIMARY KEY, payload JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()); CREATE INDEX IF NOT EXISTS reports_updated_at_idx ON reports(updated_at DESC);`);
  }
}
async function readReports(): Promise<any[]> {
  if (hostedDb) return (await hostedDb.query('SELECT payload FROM reports ORDER BY updated_at DESC')).rows.map((r: any) => r.payload);
  return localDb.prepare('SELECT payload FROM reports ORDER BY updated_at DESC').all().map((r: any) => readJson(r.payload, {}));
}
async function writeDocument(key: string, value: any) {
  if (hostedDb) await hostedDb.query('INSERT INTO app_documents (key,value,updated_at) VALUES ($1,$2,NOW()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()', [key, value]);
  else localDb.prepare('INSERT INTO app_documents (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at').run(key, JSON.stringify(value), now());
}
async function readDocument<T>(key: string, fallback: T): Promise<T> {
  if (hostedDb) return ((await hostedDb.query('SELECT value FROM app_documents WHERE key=$1', [key])).rows[0]?.value ?? fallback) as T;
  const row = localDb.prepare('SELECT value FROM app_documents WHERE key = ?').get(key) as any; return readJson(row?.value, fallback);
}
async function findReport(id: string) { return (await readReports()).find((r: any) => r.id === id); }
async function upsertReport(report: any) {
  const updated = { ...report, updatedAt: now() };
  if (hostedDb) await hostedDb.query('INSERT INTO reports (id,payload,updated_at) VALUES ($1,$2,NOW()) ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload, updated_at=NOW()', [updated.id, updated]);
  else localDb.prepare('INSERT INTO reports (id,payload,updated_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at').run(updated.id, JSON.stringify(updated), updated.updatedAt);
  return updated;
}
async function deleteReport(id: string) {
  if (hostedDb) await hostedDb.query('DELETE FROM reports WHERE id=$1', [id]); else localDb.prepare('DELETE FROM reports WHERE id=?').run(id);
}
async function reportsCount() { return hostedDb ? Number((await hostedDb.query('SELECT COUNT(*) AS count FROM reports')).rows[0].count) : Number((localDb.prepare('SELECT COUNT(*) AS count FROM reports').get() as any).count); }

// Connected SSE clients for instantaneous multi-device real-time sync
const sseClients: Response[] = [];

const broadcastSSE = (type: string, payload: any) => {
  const data = JSON.stringify({ type, payload, timestamp: Date.now() });
  const message = `data: ${data}\n\n`;

  for (let i = sseClients.length - 1; i >= 0; i--) {
    const res = sseClients[i];
    try {
      res.write(message);
    } catch (e) {
      sseClients.splice(i, 1);
    }
  }
};

// Periodic keep-alive ping for SSE connections
setInterval(() => {
  for (let i = sseClients.length - 1; i >= 0; i--) {
    const res = sseClients[i];
    try {
      res.write(": heartbeat\n\n");
    } catch (e) {
      sseClients.splice(i, 1);
    }
  }
}, 20000);

// Initialize Gemini SDK with telemetry
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    reportsCount: reportsCount(),
    activeSSECount: sseClients.length 
  });
});

// Local/hosted database API and realtime stream
app.get("/api/health", async (_req, res) => res.json({ status: "ok", timestamp: now(), reportsCount: await reportsCount(), activeSSECount: sseClients.length, database: usingSupabase ? "Supabase PostgreSQL" : "SQLite local fallback" }));
app.get("/api/reports/stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream"); res.setHeader("Cache-Control", "no-cache"); res.setHeader("Connection", "keep-alive"); res.flushHeaders(); sseClients.push(res);
  res.write(`data: ${JSON.stringify({ type: "INIT", payload: await readReports(), timestamp: Date.now() })}\n\n`);
  req.on("close", () => { const i = sseClients.indexOf(res); if (i >= 0) sseClients.splice(i, 1); });
});
app.get("/api/reports", async (_req, res) => res.json({ success: true, data: await readReports() }));
app.get("/api/reports/:id", async (req, res) => { const report = await findReport(req.params.id); report ? res.json({ success: true, data: report }) : res.status(404).json({ success: false, error: "Report not found" }); });
app.post("/api/reports", async (req, res) => { if (!req.body?.id) return res.status(400).json({ success: false, error: "Invalid report data" }); const report = await upsertReport(req.body); broadcastSSE("UPDATE_REPORT", report); res.json({ success: true, data: report }); });
app.put("/api/reports/:id", async (req, res) => { const current = await findReport(req.params.id) || {}; const report = await upsertReport({ ...current, ...req.body, id: req.params.id }); broadcastSSE("UPDATE_REPORT", report); res.json({ success: true, data: report }); });
app.delete("/api/reports/:id", async (req, res) => { await deleteReport(req.params.id); broadcastSSE("DELETE_REPORT", { id: req.params.id }); res.json({ success: true }); });
app.post("/api/reports/batch", async (req, res) => { for (const report of (Array.isArray(req.body?.reports) ? req.body.reports : [])) if (report?.id) await upsertReport(report); const reports = await readReports(); broadcastSSE("SYNC_ALL", reports); res.json({ success: true, data: reports }); });
app.get("/api/presets", async (_req, res) => res.json({ success: true, data: await readDocument("presets", null) }));
app.put("/api/presets", async (req, res) => { await writeDocument("presets", req.body); broadcastSSE("UPDATE_PRESETS", req.body); res.json({ success: true, data: req.body }); });
app.get("/api/unassigned", async (_req, res) => res.json({ success: true, data: await readDocument("unassigned", []) }));
app.put("/api/unassigned", async (req, res) => { const items = Array.isArray(req.body) ? req.body : []; await writeDocument("unassigned", items); broadcastSSE("UPDATE_UNASSIGNED", items); res.json({ success: true, data: items }); });

// OCR and Report Extraction Endpoint
app.post("/api/scan-report", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "No image data provided" });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, "");

    const ai = getGeminiClient();

    const prompt = `
Anda adalah asisten AI pembaca formulir pelaporan/logsheet transportasi dan operasional harian.
Analisis gambar formulir/catatan log ini (bisa tulisan tangan atau cetak).
Ekstrak informasi header dan seluruh baris tabel data dengan akurat:
1. Header:
   - namaKereta: Nama Kereta / Moda / Trayek / Armada (contoh di lembar: "BIB/RGA", "Argo", dll)
   - tanggal: Tanggal laporan (contoh: "Rabu 26 Agustus" atau tanggal terdeteksi)
   - kendaraan: Jenis/plat armada atau catatan atas (contoh: "Luxio", "Avanza", dll jika ada)
   - catatanHeader: Catatan tambahan di bagian atas/header
2. Baris Data (rows):
   - no: Nomor urut (integer 1, 2, 3...)
   - hp: Nomor HP / WhatsApp (baca digit angka dengan teliti, format standar e.g. "089635479788" atau "089 635 479 788")
   - nama: Nama penumpang/orang (contoh: "Wahyu (BIB)", "Farhan", "Yessy", "Erwan")
   - antar: Isi kolom ANTAR (bisa berupa centang "✓", kode seperti "Tu", "BIB", "RGA", lokasi tujuan, atau kosong)
   - jemput: Isi kolom JEMPUT (bisa berupa lokasi seperti "Tukum", "SMA 3", "Klapan", atau centang "✓", atau kosong)
   - keterangan: Isi kolom KETERANGAN (catatan khusus, lokasi, atau info lain seperti "SMA 3", "Klapan")

Pastikan semua baris yang terisi di formulir terbaca secara runtut dan teliti. Jika ada baris kosong tidak perlu dimasukkan atau cukup baris yang ada datanya.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: [
        {
          inlineData: {
            mimeType,
            data: cleanBase64,
          },
        },
        {
          text: prompt,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            namaKereta: {
              type: Type.STRING,
              description: "Nama Kereta / Armada / Rute / Kode",
            },
            tanggal: {
              type: Type.STRING,
              description: "Tanggal laporan yang tertulis",
            },
            kendaraan: {
              type: Type.STRING,
              description: "Jenis kendaraan / armada / catatan atas",
            },
            catatanHeader: {
              type: Type.STRING,
              description: "Catatan lain di header",
            },
            rows: {
              type: Type.ARRAY,
              description: "Daftar baris data penumpang/pelaporan",
              items: {
                type: Type.OBJECT,
                properties: {
                  no: { type: Type.INTEGER },
                  hp: { type: Type.STRING },
                  nama: { type: Type.STRING },
                  antar: { type: Type.STRING },
                  jemput: { type: Type.STRING },
                  keterangan: { type: Type.STRING },
                },
                required: ["no", "nama"],
              },
            },
          },
          required: ["rows"],
        },
      },
    });

    const text = response.text || "{}";
    const parsedData = JSON.parse(text);
    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error("Error parsing report image:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Gagal memproses gambar formulir",
    });
  }
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  await initDatabase();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((error) => { console.error("Failed to start server:", error); process.exit(1); });

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
const PORT = Number(process.env.PORT) || 3000;


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
  if (hostedDb) await hostedDb.query('INSERT INTO app_documents (key,value,updated_at) VALUES ($1,$2::jsonb,NOW()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()', [key, JSON.stringify(value)]);
  else localDb.prepare('INSERT INTO app_documents (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at').run(key, JSON.stringify(value), now());
}
async function readDocument<T>(key: string, fallback: T): Promise<T> {
  if (hostedDb) { const value = (await hostedDb.query('SELECT value FROM app_documents WHERE key=$1', [key])).rows[0]?.value; if (value === undefined || value === null) return fallback; return (typeof value === 'string' ? readJson(value, fallback) : value) as T; }
  const row = localDb.prepare('SELECT value FROM app_documents WHERE key = ?').get(key) as any; return readJson(row?.value, fallback);
}
async function findReport(id: string) { return (await readReports()).find((r: any) => r.id === id); }
async function upsertReport(report: any) {
  const updated = { ...report, updatedAt: now() };
  if (hostedDb) await hostedDb.query('INSERT INTO reports (id,payload,updated_at) VALUES ($1,$2::jsonb,NOW()) ON CONFLICT(id) DO UPDATE SET payload=EXCLUDED.payload, updated_at=NOW()', [updated.id, JSON.stringify(updated)]);
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

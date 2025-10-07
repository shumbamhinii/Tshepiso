// server/db.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as schema from '@shared/schema';

// Try to load .env via tsx/require first
import 'dotenv/config';

// --- Fallback .env loader (ESM-safe) if DATABASE_URL is still missing ---
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

async function ensureEnvLoaded() {
  if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const candidates = [
    path.resolve(process.cwd(), '.env'),   // running from repo root
    path.resolve(__dirname, '../.env'),    // repo root when this file is in /server
    path.resolve(__dirname, '.env'),       // .env inside /server (fallback)
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const dotenv = await import('dotenv');
      dotenv.config({ path: p });
      break;
    }
  }
}

await ensureEnvLoaded();

const conn = process.env.DATABASE_URL;
if (!conn) {
  throw new Error(
    'DATABASE_URL is not set. Put this in your .env, e.g.:\n' +
    'DATABASE_URL="postgresql://<user>:<password>@<host>:5432/<db>?sslmode=require"'
  );
}

// Validate URL and show a safe summary (no password)
let parsed: URL;
try {
  parsed = new URL(conn);
} catch {
  throw new Error('DATABASE_URL is not a valid URL. Expected: postgresql://<user>:<pass>@<host>:<port>/<db>?sslmode=require');
}
if (!parsed.username) {
  throw new Error('DATABASE_URL has no username. It must include user and password.');
}

console.log(
  `[db] connecting host=${parsed.host} db=${parsed.pathname.slice(1)} user=${parsed.username}`
);

// If you ever run behind a corporate proxy that injects certs, uncomment this dev-only escape hatch:
// if (process.env.NODE_ENV !== 'production') {
//   process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
// }

const client = new Client({
  connectionString: conn,
  // RENDER FIX: REMOVE THE MANUAL SSL CONFIGURATION ENTIRELY.
  // The connection will rely on the ?sslmode=prefer in the URL.
  // ssl: { rejectUnauthorized: false },  <--- REMOVE THIS LINE
  
  // Default to your application schema with public as fallback.
  options: '-c search_path=tbs,public',
});

(async () => {
  try {
    await client.connect();
    await client.query('set search_path to tbs, public');
    console.log('DB connected; search_path set to tbs,public');
  } catch (error) {
    console.error('Failed to connect to the database client:', error);
    process.exit(1);
  }
})();

export const db = drizzle(client, { schema });

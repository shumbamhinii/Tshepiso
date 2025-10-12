// server/db.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as schema from '@shared/schema';

import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

async function ensureEnvLoaded() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '.env'),
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

const raw = process.env.DATABASE_URL;
if (!raw) {
  throw new Error(
    'DATABASE_URL is not set. Example:\n' +
      'postgresql://<user>:<password>@<host>:<port>/<db>?sslmode=require'
  );
}

// Parse once and build a fully explicit pg config (no connectionString, no sslmode from URL)
let u: URL;
try {
  u = new URL(raw);
} catch {
  throw new Error('DATABASE_URL is not a valid URL.');
}

const host = u.hostname;
const port = Number(u.port || 5432);
const database = decodeURIComponent(u.pathname.replace(/^\//, '') || 'postgres');
const user = decodeURIComponent(u.username || '');
const password = decodeURIComponent(u.password || '');

if (!user || !password) {
  throw new Error('DATABASE_URL must include username and password.');
}

// Decide SSL strictly here (ignore sslmode in URL).
// Defaults:
// - Supabase pooler (port 6543 or *.supabase.com) → no-verify
// - Render (RENDER=true) → no-verify
// - Dev (NODE_ENV !== 'production') → no-verify (you can change this to true if you prefer)
// - Else → true (verify)
function decideSsl(): false | true | { rejectUnauthorized: false } {
  const looksSupabase = /supabase\.com$/i.test(host) || port === 6543;
  const isRender = (process.env.RENDER || '').toLowerCase() === 'true';
  const isDev = process.env.NODE_ENV !== 'production';

  // Allow explicit overrides first
  const override = (process.env.DATABASE_SSL || process.env.PGSSLMODE || '').toLowerCase();
  if (['disable', 'off', 'false'].includes(override)) return false;
  if (['no-verify', 'insecure', 'allow'].includes(override)) return { rejectUnauthorized: false };
  if (['require', 'prefer', 'verify-ca', 'verify-full', 'on', 'true'].includes(override)) return true;

  if (looksSupabase || isRender || isDev) return { rejectUnauthorized: false };
  return true;
}

const ssl = decideSsl();

// Hard-nuke libpq/pg sslmode envs that might interfere in some setups
delete (process.env as any).PGSSLMODE;
delete (process.env as any).PGSSLROOTCERT;
delete (process.env as any).PGSSLCRL;

// Optional: print versions to confirm what’s running
console.log(
  `[db] node=${process.version} host=${host}:${port} db=${database} user=${user} ssl=${JSON.stringify(ssl)}`
);

const searchPath = (process.env.DB_SCHEMA && `${process.env.DB_SCHEMA},public`) || 'tbs,public';

// Build config WITHOUT connectionString so nothing overrides our SSL object.
const client = new Client({
  host,
  port,
  database,
  user,
  password,
  ssl,
  options: `-c search_path=${searchPath}`,
});

(async () => {
  try {
    await client.connect();
    await client.query(`set search_path to ${searchPath}`);
    console.log(`DB connected; search_path set to ${searchPath}`);
  } catch (error) {
    console.error('Failed to connect to the database client:', error);
    process.exit(1);
  }
})();

export const db = drizzle(client, { schema });

// server/index.ts
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

// --- ESM-safe __dirname ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Load .env before anything else needs it ---
const envCandidates = [
  path.resolve(process.cwd(), '.env'),   // run from repo root
  path.resolve(__dirname, '../.env'),    // repo root when this file is in /server
  path.resolve(__dirname, '.env'),       // .env inside /server (fallback)
];

for (const p of envCandidates) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    break;
  }
}

import express, { type Request, type Response, type NextFunction } from 'express';
import { registerRoutes } from './routes';
import { setupVite, serveStatic, log } from './vite';

// Ensure DB connects after env is loaded
await import('./db');

const app = express();
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: false, limit: "20mb" }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: unknown;

  const originalResJson = res.json.bind(res) as typeof res.json;
  (res as any).json = (bodyJson: unknown, ...args: any[]) => {
    capturedJsonResponse = bodyJson;
    return originalResJson(bodyJson as any, ...args);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (path.startsWith('/api')) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse !== undefined) {
        try { logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`; } catch {}
      }
      if (logLine.length > 80) logLine = logLine.slice(0, 79) + '…';
      log(logLine);
    }
  });

  next();
});

const server = await registerRoutes(app);

// Global error handler (don't crash process)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  console.error('API Error:', err);
  res.status(status).json({ message });
});

// Dev: attach Vite middleware; Prod: serve static
if (app.get('env') === 'development') {
  await setupVite(app, server);
} else {
  serveStatic(app);
}

// Always serve on 5000 (API + client)
//const port = 5000;
//const host = '127.0.0.1';

// Always use Render's PORT and bind to 0.0.0.0
// Always use Render's PORT and bind to 0.0.0.0
const port = Number(process.env.PORT) || 5000;   // Render sets PORT
const host = '0.0.0.0';                           // NOT 127.0.0.1

// If registerRoutes(app) returns an http.Server, keep using it:
server.listen(port, host, () => {
  log(`serving on http://${host}:${port}`);
});

// (If registerRoutes returns the Express app instead, do:)
// app.listen(port, host, () => {
//   log(`serving on http://${host}:${port}`);
// });


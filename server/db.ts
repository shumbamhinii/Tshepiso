// server/db.ts - (This file is required for the updated storage.ts)
import { drizzle } from 'drizzle-orm/node-postgres';
import { Client } from 'pg';
import * as schema from '@shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set. Ensure it is configured in your environment or .env file.');
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,

  // NEW: Add options to set the search_path to 'tbs' schema
  // This tells PostgreSQL to look for tables in the 'tbs' schema by default
  options: '-c search_path=tbs,public' // Add 'public' as fallback
});

// We make this an IIFE (Immediately Invoked Function Expression)
// so we can use await at the top level and ensure client.connect() is awaited
(async () => {
  try {
    await client.connect();
    console.log("Database client connected successfully.");
  } catch (error) {
    console.error("Failed to connect to the database client:", error);
    process.exit(1); // Exit the process if DB connection fails
  }
})();

export const db = drizzle(client, { schema });

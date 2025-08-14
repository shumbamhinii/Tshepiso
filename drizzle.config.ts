import { defineConfig } from "drizzle-kit";

// WARNING: Hardcoding credentials is not recommended for production.
// Use environment variables instead (as in your original setup).
const DATABASE_URL="postgresql://thsepiso_user:ToIFA5eD56rb4XqPS5f80btKZQhaEK5V@dpg-d2ek9puuk2gs73bh3qr0-a.oregon-postgres.render.com:5432/thsepiso?sslmode=require"
;


// In a real scenario, you would still keep this check for environment variables
// if you were loading it from .env or your hosting provider's config.
// For this hardcoded version, this check becomes redundant, but I'll keep it commented out
// to show where it would normally be.
/*
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}
*/

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    // Using the hardcoded URL directly
    url: DATABASE_URL,
  },
});
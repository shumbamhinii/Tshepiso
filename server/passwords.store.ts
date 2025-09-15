import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

type Area = "pricing" | "quotations";

type PasswordDB = {
  pricing?: string;     // bcrypt hash
  quotations?: string;  // bcrypt hash
};

const FILE = path.join(process.cwd(), "passwords.json");

function readDB(): PasswordDB {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8") || "{}");
  } catch {
    return {};
  }
}

function writeDB(db: PasswordDB) {
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2), "utf8");
}

export async function setPassword(area: Area, plain: string) {
  const db = readDB();
  db[area] = await bcrypt.hash(plain, 10);
  writeDB(db);
}

export function hasAnyPassword(): boolean {
  const db = readDB();
  return Boolean(db.pricing || db.quotations);
}

export async function verify(area: Area, plain: string): Promise<boolean> {
  const db = readDB();
  const hash = db[area];
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

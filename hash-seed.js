// hash-seed.js
import bcrypt from "bcryptjs";

const run = async () => {
  console.log("pricing123 →", await bcrypt.hash("pricing123", 10));
  console.log("quotes123  →", await bcrypt.hash("quotes123", 10));
};

run();

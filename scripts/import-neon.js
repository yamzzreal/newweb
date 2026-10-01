#!/usr/bin/env node
"use strict";

const fs = require("fs");
const { neon } = require("@neondatabase/serverless");

const storeFile = process.argv[2];
const privateFile = process.argv[3];

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL belum diatur.");
  process.exit(1);
}

if (!storeFile) {
  console.error("Usage: node scripts/import-neon.js store.json [private.json]");
  process.exit(1);
}

function readJson(file) {
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  return parsed && parsed.record ? parsed.record : parsed;
}

async function main() {
  const sql = neon(process.env.DATABASE_URL);

  await sql`
    CREATE TABLE IF NOT EXISTS yamzz_store (
      id INTEGER PRIMARY KEY,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS yamzz_private (
      id INTEGER PRIMARY KEY,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  const store = readJson(storeFile);

  await sql`
    INSERT INTO yamzz_store (id, data)
    VALUES (1, ${JSON.stringify(store)}::jsonb)
    ON CONFLICT (id)
    DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
  `;

  console.log(`Store imported: ${storeFile}`);

  if (privateFile) {
    const privateDb = readJson(privateFile);

    await sql`
      INSERT INTO yamzz_private (id, data)
      VALUES (1, ${JSON.stringify(privateDb)}::jsonb)
      ON CONFLICT (id)
      DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
    `;

    console.log(`Private database imported: ${privateFile}`);
  }

  console.log("Import Neon selesai.");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

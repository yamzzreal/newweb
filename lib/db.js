"use strict";

const { neon } = require("@neondatabase/serverless");

let initPromise = null;

function getSql() {
  const url = String(process.env.DATABASE_URL || "").trim();
  if (!url) {
    const e = new Error("DATABASE_URL belum dikonfigurasi. Tambahkan connection string Neon di Vercel.");
    e.statusCode = 500;
    throw e;
  }
  return neon(url);
}

async function initDb() {
  if (!initPromise) {
    initPromise = (async () => {
      const sql = getSql();

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

      await sql`
        INSERT INTO yamzz_store (id, data)
        VALUES (1, '{}'::jsonb)
        ON CONFLICT (id) DO NOTHING
      `;

      await sql`
        INSERT INTO yamzz_private (id, data)
        VALUES (1, '{}'::jsonb)
        ON CONFLICT (id) DO NOTHING
      `;
    })().catch(error => {
      initPromise = null;
      throw error;
    });
  }

  return initPromise;
}

async function readStore() {
  await initDb();
  const sql = getSql();
  const rows = await sql`SELECT data FROM yamzz_store WHERE id = 1`;
  return rows[0]?.data || {};
}

async function writeStore(data) {
  await initDb();
  const sql = getSql();
  await sql`
    UPDATE yamzz_store
    SET data = ${JSON.stringify(data || {})}::jsonb,
        updated_at = NOW()
    WHERE id = 1
  `;
}

async function readPrivate() {
  await initDb();
  const sql = getSql();
  const rows = await sql`SELECT data FROM yamzz_private WHERE id = 1`;
  return rows[0]?.data || {};
}

async function writePrivate(data) {
  await initDb();
  const sql = getSql();
  await sql`
    UPDATE yamzz_private
    SET data = ${JSON.stringify(data || {})}::jsonb,
        updated_at = NOW()
    WHERE id = 1
  `;
}

module.exports = {
  getSql,
  initDb,
  readStore,
  writeStore,
  readPrivate,
  writePrivate
};

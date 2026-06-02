/**
 * Runs database/schema.sql against the configured MySQL server.
 *
 *   npm run migrate
 *
 * Uses a multi-statement connection so the whole file executes at once.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function migrate() {
  const schemaPath = path.join(__dirname, '..', '..', '..', 'database', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  // Connect WITHOUT selecting a database (schema.sql creates it) and allow
  // multiple statements in one call.
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  try {
    await conn.query(sql);
    console.log('✓ Schema applied successfully');
  } finally {
    await conn.end();
  }
}

migrate().catch((err) => {
  console.error('✗ Migration failed:', err.message);
  process.exit(1);
});

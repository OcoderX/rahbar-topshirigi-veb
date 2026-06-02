/**
 * Server entry point. Verifies the DB connection on boot, then starts listening.
 */
require('dotenv').config();
const app = require('./app');
const { pool } = require('./config/db');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    // Fail fast if the DB is unreachable.
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('✓ Connected to MySQL');

    app.listen(PORT, () => {
      console.log(`✓ API listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('✗ Failed to start server:', err.message);
    console.error('  Check your .env DB settings and that MySQL is running.');
    process.exit(1);
  }
}

start();

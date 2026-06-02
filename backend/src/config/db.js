/**
 * MySQL connection pool.
 * We use mysql2's promise pool so every query returns a Promise and we can
 * use async/await throughout the service layer.
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'task_tracker',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true, // return DATE/DATETIME as 'YYYY-MM-DD' strings, not JS Date objects
});

/**
 * Tiny helper so callers can do `const rows = await query(sql, params)`
 * without destructuring [rows, fields] every time.
 */
async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

module.exports = { pool, query };

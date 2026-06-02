/**
 * Seeds demo data: one admin, three employees, and a handful of tasks.
 * Passwords are bcrypt-hashed here so they match what the login endpoint expects.
 *
 *   npm run seed
 *
 * Safe to re-run: it clears the tables first.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const DEMO_PASSWORD = 'password123';

async function seed() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // Clear existing data (children first because of FKs).
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query('TRUNCATE TABLE activity_logs');
    await conn.query('TRUNCATE TABLE tasks');
    await conn.query('TRUNCATE TABLE users');
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    const users = [
      ['Admin User', 'admin@demo.com', hash, 'admin'],
      ['Aisha Khan', 'aisha@demo.com', hash, 'employee'],
      ['Ben Carter', 'ben@demo.com', hash, 'employee'],
      ['Chen Wei', 'chen@demo.com', hash, 'employee'],
    ];
    const [userResult] = await conn.query(
      'INSERT INTO users (name, email, password, role) VALUES ?',
      [users]
    );
    const firstUserId = userResult.insertId; // admin
    const aisha = firstUserId + 1;
    const ben = firstUserId + 2;
    const chen = firstUserId + 3;

    const tasks = [
      ['Prepare Q3 sales deck', 'Build the pitch deck for the Q3 review.', aisha, 'in_progress', '2026-06-20'],
      ['Update CRM records', 'Clean up duplicate leads in the CRM.', aisha, 'pending', '2026-06-10'],
      ['Onboard new client', 'Run kickoff call and set up the account.', ben, 'completed', '2026-05-28'],
      ['Competitor analysis', 'Compare our pricing against top 3 competitors.', ben, 'pending', '2026-06-25'],
      ['Write product FAQ', 'Draft FAQ for the new feature launch.', chen, 'in_progress', '2026-06-15'],
      ['Schedule demo calls', 'Book demos with the 5 inbound leads.', chen, 'pending', '2026-06-08'],
    ];
    await conn.query(
      'INSERT INTO tasks (title, description, assigned_to, status, due_date) VALUES ?',
      [tasks]
    );

    await conn.query(
      'INSERT INTO activity_logs (user_id, action, entity, details) VALUES (?, ?, ?, ?)',
      [firstUserId, 'SEED', 'system', 'Database seeded with demo data']
    );

    await conn.commit();

    console.log('✓ Seed complete');
    console.log('\nDemo accounts (password for all: %s):', DEMO_PASSWORD);
    console.log('  admin@demo.com   (admin)');
    console.log('  aisha@demo.com   (employee)');
    console.log('  ben@demo.com     (employee)');
    console.log('  chen@demo.com    (employee)');
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('✗ Seed failed:', err.message);
  process.exit(1);
});

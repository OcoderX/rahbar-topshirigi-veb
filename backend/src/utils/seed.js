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
      ['Administrator', 'admin@demo.com', hash, 'admin'],
      ['Oysha Karimova', 'aisha@demo.com', hash, 'employee'],
      ['Bekzod Rustamov', 'ben@demo.com', hash, 'employee'],
      ['Shahnoza Aliyeva', 'chen@demo.com', hash, 'employee'],
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
      ['3-chorak savdo taqdimotini tayyorlash', 'Kompaniya chorak hisoboti uchun taqdimot slaydlarini yaratish.', aisha, 'in_progress', '2026-06-20'],
      ['CRM tizimi ma\'lumotlarini yangilash', 'CRM bazasidagi takroriy mijoz ma\'lumotlarini tozalash va saralash.', aisha, 'pending', '2026-06-10'],
      ['Yangi hamkorni tizimga kiritish', 'Hamkor bilan tanishuv uchrashuvini o\'tkazish va shartnoma profilini ochish.', ben, 'completed', '2026-05-28'],
      ['Bozordagi raqobatchilar tahlili', 'Mahsulotimiz narxlari va shartlarini asosiy 3 ta raqobatchi bilan solishtirish.', ben, 'pending', '2026-06-25'],
      ['Mahsulot bo\'yicha FAQ qo\'llanmasini yozish', 'Yangi funksiyalar bo\'yicha mijozlar ko\'p beradigan savollarga javoblar tayyorlash.', chen, 'in_progress', '2026-06-15'],
      ['Mijozlar bilan demo uchrashuvlarini belgilash', 'Sayt orqali ariza qoldirgan 5 ta mijoz bilan demo qo\'ng\'iroqlarini rejalashtirish.', chen, 'pending', '2026-06-08'],
    ];
    await conn.query(
      'INSERT INTO tasks (title, description, assigned_to, status, due_date) VALUES ?',
      [tasks]
    );

    await conn.query(
      'INSERT INTO activity_logs (user_id, action, entity, details) VALUES (?, ?, ?, ?)',
      [firstUserId, 'SEED', 'system', 'Baza dastlabki ma\'lumotlar bilan to\'ldirildi']
    );

    await conn.commit();

    console.log('✓ Baza muvaffaqiyatli to‘ldirildi (seed complete)');
    console.log('\nDemo hisoblar (parol barcha uchun: %s):', DEMO_PASSWORD);
    console.log('  admin@demo.com   (Administrator)');
    console.log('  aisha@demo.com   (Xodim - Oysha)');
    console.log('  ben@demo.com     (Xodim - Bekzod)');
    console.log('  chen@demo.com    (Xodim - Shahnoza)');
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

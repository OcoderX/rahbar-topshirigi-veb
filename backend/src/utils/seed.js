/**
 * Andijon viloyati tashkiliy tuzilmasi uchun demo akkauntlar.
 *
 * Viloyat: 1 rahbar, 1 rahbar o'rinbosari, 8 kurator.
 * Har bir tuman: 1 bo'lim boshlig'i va 3 xodim.
 *
 *   npm run seed
 *
 * Qayta ishga tushirish xavfsiz: jadvallar avval tozalanadi.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

const DEMO_PASSWORD = 'password123';
const REGION = 'Andijon viloyati';

const DISTRICTS = [
  { name: 'Andijon tumani', slug: 'andijon' },
  { name: 'Asaka tumani', slug: 'asaka' },
  { name: 'Baliqchi tumani', slug: 'baliqchi' },
  { name: "Bo'ston tumani", slug: 'boston' },
  { name: 'Buloqboshi tumani', slug: 'buloqboshi' },
  { name: 'Izboskan tumani', slug: 'izboskan' },
  { name: 'Jalaquduq tumani', slug: 'jalaquduq' },
  { name: "Xo'jaobod tumani", slug: 'xojaobod' },
  { name: "Qo'rg'ontepa tumani", slug: 'qorgontepa' },
  { name: 'Marhamat tumani', slug: 'marhamat' },
  { name: "Oltinko'l tumani", slug: 'oltinkol' },
  { name: 'Paxtaobod tumani', slug: 'paxtaobod' },
  { name: 'Shahrixon tumani', slug: 'shahrixon' },
  { name: "Ulug'nor tumani", slug: 'ulugnor' },
];

function buildUsers(passwordHash) {
  const users = [
    [
      'Andijon viloyati rahbari',
      'rahbar@andijon.uz',
      passwordHash,
      'admin',
      'Viloyat rahbari',
      0,
      'region',
      REGION,
      null,
      null,
    ],
    [
      "Andijon viloyati rahbar o'rinbosari",
      'orinbosar@andijon.uz',
      passwordHash,
      'employee',
      "Viloyat rahbar o'rinbosari",
      1,
      'region',
      REGION,
      null,
      null,
    ],
  ];

  for (let number = 1; number <= 8; number += 1) {
    users.push([
      `Andijon viloyati kuratori ${number}`,
      `kurator${number}@andijon.uz`,
      passwordHash,
      'employee',
      `Viloyat kuratori ${number}`,
      2,
      'region',
      REGION,
      null,
      null,
    ]);
  }

  for (const district of DISTRICTS) {
    users.push([
      `${district.name} bo'lim boshlig'i`,
      `${district.slug}.boshliq@andijon.uz`,
      passwordHash,
      'employee',
      "Bo'lim boshlig'i",
      3,
      'district',
      REGION,
      district.name,
      null,
    ]);

    for (let number = 1; number <= 3; number += 1) {
      users.push([
        `${district.name} xodimi ${number}`,
        `${district.slug}.xodim${number}@andijon.uz`,
        passwordHash,
        'employee',
        `Xodim ${number}`,
        4,
        'district',
        REGION,
        district.name,
        null,
      ]);
    }
  }

  return users;
}

async function seed() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const users = buildUsers(hash);
  const conn = await pool.getConnection();

  if (users.length !== 66) {
    throw new Error(`Tashkiliy tuzilma noto'g'ri: 66 ta akkaunt o'rniga ${users.length} ta yaratildi`);
  }

  try {
    await conn.beginTransaction();

    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query('TRUNCATE TABLE activity_logs');
    await conn.query('TRUNCATE TABLE tasks');
    await conn.query('TRUNCATE TABLE users');
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    const [userResult] = await conn.query(
      `INSERT INTO users
        (name, email, password, role, position, hierarchy_rank, territory_type, region, district, avatar)
       VALUES ?`,
      [users]
    );

    const userId = (index) => userResult.insertId + index;
    const tasks = [
      ['Viloyat bo\'yicha haftalik ijro nazorati', 'Barcha tumanlardan haftalik ma\'lumotlarni yig\'ish va umumlashtirish.', userId(1), 'in_progress', '2026-10-15'],
      ['Hududiy loyihalar monitoringi', 'Tumanlardagi ustuvor loyihalar holatini tahlil qilish.', userId(2), 'in_progress', '2026-10-18'],
      ['Andijon tumani hisoboti', 'Tumandagi bajarilgan ishlar bo\'yicha hisobot tayyorlash.', userId(10), 'pending', '2026-10-20'],
      ['Murojaatlar tahlili', 'Fuqarolar murojaatlarini yo\'nalishlar kesimida tahlil qilish.', userId(11), 'in_progress', '2026-10-14'],
      ['Asaka tumani ko\'rsatkichlari', 'Asosiy ko\'rsatkichlarni yangilash va tasdiqlash.', userId(14), 'pending', '2026-10-22'],
      ['Baliqchi tumani ma\'lumotlari', 'Ma\'lumotlarni elektron jadvalga kiritish.', userId(19), 'submitted', '2026-10-05'],
      ['Tumanlar kesimida taqqoslash', '14 ta tuman ko\'rsatkichlarini o\'zaro taqqoslash.', userId(3), 'in_progress', '2026-10-25'],
      ['Paxtaobod tumani reja-jadvali', 'Kelgusi oy uchun ishlar reja-jadvalini shakllantirish.', userId(54), 'pending', '2026-10-28'],
    ];

    await conn.query(
      'INSERT INTO tasks (title, description, assigned_to, status, due_date) VALUES ?',
      [tasks]
    );

    await conn.query(
      'INSERT INTO activity_logs (user_id, action, entity, details) VALUES (?, ?, ?, ?)',
      [userId(0), 'SEED', 'system', 'Andijon viloyati va 14 ta tuman akkauntlari yaratildi']
    );

    await conn.commit();

    console.log('Baza Andijon viloyati tashkiliy tuzilmasi bilan to\'ldirildi');
    console.log('Jami: 66 ta akkaunt (viloyat: 10, tumanlar: 56)');
    console.log('Barcha akkauntlar uchun parol: %s', DEMO_PASSWORD);
    console.log('Rahbar: rahbar@andijon.uz');
    console.log("O'rinbosar: orinbosar@andijon.uz");
    console.log('Namuna tuman xodimi: andijon.xodim1@andijon.uz');
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed bajarilmadi:', err.message);
  process.exit(1);
});

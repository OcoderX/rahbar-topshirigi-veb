const { pool } = require('../config/db');

async function updateDb() {
  const conn = await pool.getConnection();
  try {
    const [cols] = await conn.query("SHOW COLUMNS FROM messages LIKE 'is_edited'");
    if (cols.length === 0) {
      await conn.query('ALTER TABLE messages ADD COLUMN is_edited BOOLEAN NOT NULL DEFAULT FALSE');
      await conn.query('ALTER TABLE messages ADD COLUMN edited_at DATETIME NULL');
      console.log('✓ Added is_edited and edited_at columns');
    } else {
      console.log('✓ is_edited column already exists');
    }

    await conn.query(`
      CREATE TABLE IF NOT EXISTS message_edits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message_id INT NOT NULL,
        old_message TEXT NOT NULL,
        new_message TEXT NOT NULL,
        edited_by INT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_edits_message FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
        CONSTRAINT fk_edits_user FOREIGN KEY (edited_by) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_edits_message (message_id)
      ) ENGINE=InnoDB;
    `);
    console.log('✓ message_edits table created or exists');
  } finally {
    conn.release();
    process.exit(0);
  }
}

updateDb().catch((e) => {
  console.error('DB ERROR:', e);
  process.exit(1);
});

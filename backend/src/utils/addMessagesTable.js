const { pool } = require('../config/db');

async function main() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        task_id INT NULL,
        message TEXT NULL,
        audio_url VARCHAR(500) NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        read_at DATETIME NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_messages_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_messages_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
        INDEX idx_messages_sender (sender_id),
        INDEX idx_messages_receiver (receiver_id),
        INDEX idx_messages_task (task_id),
        INDEX idx_messages_created (created_at)
      ) ENGINE=InnoDB;
    `);
    console.log('✓ Messages table successfully created or already exists');
  } finally {
    conn.release();
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('✗ Migration failed:', err);
  process.exit(1);
});

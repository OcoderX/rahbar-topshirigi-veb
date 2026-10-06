-- =====================================================================
-- Employee Task Tracker — Database Schema
-- MySQL 8.x
--
-- Apply with:  mysql -u root -p < database/schema.sql
--        or:   cd backend && npm run migrate
-- =====================================================================

CREATE DATABASE IF NOT EXISTS task_tracker
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE task_tracker;

-- Drop in dependency order so the script is re-runnable.
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS users;

-- ---------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------
CREATE TABLE users (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(100)        NOT NULL,
  email          VARCHAR(255)        NOT NULL UNIQUE,
  password       VARCHAR(255)        NOT NULL,                -- bcrypt hash
  role           ENUM('admin','employee') NOT NULL DEFAULT 'employee',
  position       VARCHAR(150)        NULL,                    -- lavozimi
  hierarchy_rank INT                 NOT NULL DEFAULT 4,      -- 1: Rahbar o'rinbosari, 2: Kurator, 3: Bo'lim boshlig'i, 4: Xodim
  territory_type ENUM('region','district') NOT NULL DEFAULT 'region',
  region         VARCHAR(100)        NOT NULL DEFAULT 'Andijon viloyati',
  district       VARCHAR(100)        NULL,
  avatar         VARCHAR(255)        NULL,                    -- rasm URL
  created_at     TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_users_territory (territory_type, district),
  INDEX idx_users_hierarchy (hierarchy_rank)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------
CREATE TABLE tasks (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  title                  VARCHAR(200)       NOT NULL,
  description            TEXT               NULL,
  assigned_to            INT                NULL,
  status                 ENUM('pending','in_progress','submitted','completed') NOT NULL DEFAULT 'pending',
  due_date               DATETIME           NULL,
  audio_url              VARCHAR(500)       NULL,                    -- ovozli xabar
  attachments            LONGTEXT           NULL,                    -- JSON ro'yxat: fayllar, pdf, rasm, video
  viewed_at              DATETIME           NULL,                    -- xodim ochgan vaqt
  submitted_at           DATETIME           NULL,                    -- xodim rahbar tasdig'iga yuborgan vaqt
  completed_at           DATETIME           NULL,                    -- rahbar tasdiqlagan vaqt
  completion_note        TEXT               NULL,                    -- xodim hisoboti
  completion_audio       VARCHAR(500)       NULL,                    -- xodim ovozli hisoboti
  completion_attachments LONGTEXT           NULL,                    -- xodim biriktirgan hisobot fayllari
  rework_required        BOOLEAN            NOT NULL DEFAULT FALSE,  -- qayta ishlash talab qilingan
  rework_reason          TEXT               NULL,                    -- rahbarning rad etish sababi
  rework_requested_at    DATETIME           NULL,
  rework_requested_by    INT                NULL,
  rework_count           INT                NOT NULL DEFAULT 0,
  created_at             TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP
                                          ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tasks_assigned_to
    FOREIGN KEY (assigned_to) REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT fk_tasks_rework_requested_by
    FOREIGN KEY (rework_requested_by) REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  INDEX idx_tasks_assigned_to (assigned_to),
  INDEX idx_tasks_status (status),
  INDEX idx_tasks_rework_required (rework_required),
  INDEX idx_tasks_due_date (due_date)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- activity_logs  (bonus — audit trail)
-- ---------------------------------------------------------------------
CREATE TABLE activity_logs (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT          NULL,
  action     VARCHAR(50)  NOT NULL,        -- e.g. CREATE_TASK, UPDATE_TASK
  entity     VARCHAR(50)  NOT NULL,        -- e.g. task, user, system
  entity_id  INT          NULL,
  details    VARCHAR(500) NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_logs_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  INDEX idx_logs_created_at (created_at)
) ENGINE=InnoDB;

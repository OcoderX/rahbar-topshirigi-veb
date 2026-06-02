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
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100)        NOT NULL,
  email      VARCHAR(255)        NOT NULL UNIQUE,
  password   VARCHAR(255)        NOT NULL,                -- bcrypt hash
  role       ENUM('admin','employee') NOT NULL DEFAULT 'employee',
  created_at TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------
CREATE TABLE tasks (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(200)       NOT NULL,
  description TEXT               NULL,
  assigned_to INT                NULL,
  status      ENUM('pending','in_progress','completed') NOT NULL DEFAULT 'pending',
  due_date    DATE               NULL,
  created_at  TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP
                                          ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tasks_assigned_to
    FOREIGN KEY (assigned_to) REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  INDEX idx_tasks_assigned_to (assigned_to),
  INDEX idx_tasks_status (status),
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

-- Migration: 003_add_teacher_code_to_users.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS teacher_code TEXT UNIQUE; 

ALTER TABLE users
  ADD CONSTRAINT teacher_code_six_digits CHECK (
    teacher_code ~ '^[0-9]{6}$'
  );

-- Migration: 005_drop_teacher_code.sql
ALTER TABLE users DROP COLUMN IF EXISTS teacher_code;
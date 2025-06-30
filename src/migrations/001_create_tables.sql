-- Migration: 001_create_tables.sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('teacher', 'student')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    code TEXT UNIQUE NOT NULL,
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    due_date DATE NOT NULL,
    time_limit INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create session_students table (many-to-many)
CREATE TABLE IF NOT EXISTS session_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('pending', 'completed')) DEFAULT 'pending',
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
    UNIQUE(session_id, student_id)
);

-- Create questions table
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    type TEXT CHECK (type IN ('rating', 'multiple-choice', 'text')) NOT NULL,
    options JSONB,
    is_default BOOLEAN DEFAULT FALSE
);

-- Create responses table
CREATE TABLE IF NOT EXISTS responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    response TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

ALTER TABLE sessions ADD COLUMN assigned_students_count integer DEFAULT 0;

-- Trigger function to update assigned_students_count
CREATE OR REPLACE FUNCTION update_assigned_students_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sessions
  SET assigned_students_count = (
    SELECT COUNT(*) FROM session_students WHERE session_id = NEW.session_id
  )
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for insert
CREATE TRIGGER session_students_insert_trigger
AFTER INSERT ON session_students
FOR EACH ROW
EXECUTE FUNCTION update_assigned_students_count();

-- Trigger for delete
CREATE TRIGGER session_students_delete_trigger
AFTER DELETE ON session_students
FOR EACH ROW
EXECUTE FUNCTION update_assigned_students_count();

ALTER TABLE responses ADD CONSTRAINT unique_student_session UNIQUE (session_id, student_id, question_id);

ALTER TABLE questions ADD COLUMN scale integer;
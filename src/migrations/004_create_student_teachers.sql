-- Migration: 004_create_student_teachers.sql

CREATE TABLE IF NOT EXISTS student_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  UNIQUE(student_id, teacher_id)
);

ALTER TABLE student_teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their own teacher enrollments"
  ON student_teachers FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students can enroll with a teacher"
  ON student_teachers FOR INSERT
  WITH CHECK (student_id = auth.uid()); 
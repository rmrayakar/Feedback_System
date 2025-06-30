-- Migration: 002_enable_rls_and_policies.sql

-- Enable RLS on all main tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

-- Users can view/update their own profile
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT USING (auth.uid() = id);

-- Only teachers can insert sessions
CREATE POLICY "Teachers can insert sessions"
  ON sessions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'teacher'));

-- Students/teachers can view sessions they are assigned to or created
CREATE POLICY "Students/Teachers can view sessions"
  ON sessions FOR SELECT USING (
    EXISTS (SELECT 1 FROM session_students WHERE session_id = id AND student_id = auth.uid())
    OR teacher_id = auth.uid()
  );

-- Students can insert responses for their assigned sessions
CREATE POLICY "Students can insert responses"
  ON responses FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM session_students WHERE session_id = session_id AND student_id = auth.uid())
  ); 

-- Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Allow anyone to select teachers by teacher_code (for enrollment only)
CREATE POLICY "Allow select teacher by code for enrollment"
  ON users FOR SELECT
  USING (
    role = 'teacher'
    AND teacher_code IS NOT NULL
  );

-- Remove the old policy if it exists
DROP POLICY IF EXISTS "Allow teachers to view students and users to view themselves" ON users;

-- Create the new policy using user_metadata.role from the JWT
CREATE POLICY "Allow teachers to view students and users to view themselves"
  ON users FOR SELECT
  USING (
    (role = 'student' AND auth.jwt() -> 'user_metadata' ->> 'role' = 'teacher')
    OR id = auth.uid()
  );

-- Teachers can insert questions for their own sessions
CREATE POLICY "Teachers can insert questions for their own sessions"
  ON questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = questions.session_id
      AND sessions.teacher_id = auth.uid()
    )
  );

-- Teachers can assign students to their own sessions
CREATE POLICY "Teachers can assign students to their own sessions"
  ON session_students FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = session_students.session_id
      AND sessions.teacher_id = auth.uid()
    )
  );

-- Allow select by code
CREATE POLICY "Allow select by code"
  ON sessions FOR SELECT
  USING (true);

-- Teachers can insert questions for their own sessions
  CREATE POLICY "Teachers can insert questions for their own sessions"
    ON questions FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM sessions
        WHERE sessions.id = questions.session_id
        AND sessions.teacher_id = auth.uid()
      )
    );

-- Allow students and teachers to view questions for their sessions
CREATE POLICY "Allow students and teachers to view questions for their sessions"
  ON questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = questions.session_id
      AND (
        sessions.teacher_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM session_students
          WHERE session_students.session_id = sessions.id
          AND session_students.student_id = auth.uid()
        )
      )
    )
  );

-- Remove any overly permissive SELECT policies first
DROP POLICY IF EXISTS "Allow all select" ON responses;
DROP POLICY IF EXISTS "Allow teachers and students to view responses for their sessions" ON responses;

-- Allow only teachers to view responses for their own sessions
CREATE POLICY "Allow teachers to view responses for their sessions"
  ON responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = responses.session_id
      AND sessions.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Allow anyone to view teachers"
  ON users FOR SELECT
  USING (role = 'teacher');
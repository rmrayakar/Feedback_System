-- Migration: 005_add_delete_policies.sql

-- Teachers can delete their own sessions
CREATE POLICY "Teachers can delete their own sessions"
  ON sessions FOR DELETE
  USING (teacher_id = auth.uid());

-- Teachers can delete questions for their own sessions
CREATE POLICY "Teachers can delete questions for their own sessions"
  ON questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = questions.session_id
      AND sessions.teacher_id = auth.uid()
    )
  );

-- Teachers can delete responses for their own sessions
CREATE POLICY "Teachers can delete responses for their own sessions"
  ON responses FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = responses.session_id
      AND sessions.teacher_id = auth.uid()
    )
  );

-- Teachers can delete session_students assignments for their own sessions
CREATE POLICY "Teachers can delete session_students for their own sessions"
  ON session_students FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = session_students.session_id
      AND sessions.teacher_id = auth.uid()
    )
  ); 
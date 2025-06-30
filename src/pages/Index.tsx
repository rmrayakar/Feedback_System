import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import AuthForm from "@/components/AuthForm";
import TeacherDashboard from "./TeacherDashboard";
import StudentDashboard from "./StudentDashboard";
import CreateSession from "./CreateSession";
import FeedbackForm from "./FeedbackForm";
import SessionResults from "./SessionResults";
import TeacherProfile from "./TeacherProfile";
import StudentProfile from "./StudentProfile";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [user, setUser] = useState<any>(null);

  const handleLogin = (userType: "teacher" | "student", userData: any) => {
    setUser({ ...userData, type: userType });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  useEffect(() => {
    const getSessionAndUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session && session.user) {
        // Fetch user profile from users table
        const { data: userProfile } = await supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .single();
        if (userProfile) {
          setUser({ ...userProfile, type: userProfile.role });
        }
      }
    };
    getSessionAndUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) setUser(null);
      }
    );
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  if (!user) {
    return <AuthForm onLogin={handleLogin} />;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          user.type === "teacher" ? (
            <Navigate to="/teacher/dashboard" replace />
          ) : (
            <Navigate to="/student/dashboard" replace />
          )
        }
      />

      {/* Teacher Routes */}
      {user.type === "teacher" && (
        <>
          <Route
            path="/teacher/dashboard"
            element={<TeacherDashboard user={user} onLogout={handleLogout} />}
          />
          <Route
            path="/teacher/profile"
            element={<TeacherProfile user={user} onLogout={handleLogout} />}
          />
          <Route
            path="/teacher/create-session"
            element={<CreateSession user={user} onLogout={handleLogout} />}
          />
          <Route
            path="/teacher/session-results/:sessionId"
            element={<SessionResults user={user} onLogout={handleLogout} />}
          />
        </>
      )}

      {/* Student Routes */}
      {user.type === "student" && (
        <>
          <Route
            path="/student/dashboard"
            element={<StudentDashboard user={user} onLogout={handleLogout} />}
          />
          <Route
            path="/student/feedback/:sessionCode"
            element={<FeedbackForm user={user} />}
          />
          <Route
            path="/student/profile"
            element={<StudentProfile user={user} onLogout={handleLogout} />}
          />
        </>
      )}

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default Index;

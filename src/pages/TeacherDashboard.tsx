import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Plus,
  BarChart3,
  Clock,
  CheckCircle,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";

interface TeacherDashboardProps {
  user: any;
  onLogout?: () => void;
}

const TeacherDashboard = ({ user, onLogout }: TeacherDashboardProps) => {
  const navigate = useNavigate();

  const [sessions, setSessions] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);

  useEffect(() => {
    // Fetch sessions created by this teacher
    const fetchSessions = async () => {
      console.log("Fetching sessions for teacher:", user.id);
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("teacher_id", user.id);
      console.log("Sessions result:", { data, error });
      if (!error && data) setSessions(data);
    };
    // Fetch all students
    const fetchStudents = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, created_at")
        .eq("role", "student");
      if (!error && data) setStudents(data);
    };
    // Fetch responses for all sessions
    const fetchResponses = async (sessionIds: string[]) => {
      if (sessionIds.length === 0) {
        setResponses([]);
        return;
      }
      const { data: resp } = await supabase
        .from("responses")
        .select("student_id, session_id")
        .in("session_id", sessionIds);
      setResponses(resp || []);
    };
    fetchSessions();
    fetchStudents();
    // After sessions are fetched, fetch assigned students and responses
    // Use a separate effect to wait for sessions
  }, [user.id]);

  useEffect(() => {
    const sessionIds = sessions.map((s) => s.id);
    console.log("Session IDs for fetching responses:", sessionIds);

    if (sessionIds.length > 0) {
      const fetchResponses = async () => {
        console.log("Fetching responses for sessions:", sessionIds);

        const { data: resp, error: respError } = await supabase
          .from("responses")
          .select("student_id, session_id")
          .in("session_id", sessionIds);

        console.log("Responses result:", { data: resp, error: respError });
        setResponses(resp || []);
      };
      fetchResponses();
    } else {
      console.log("No sessions to fetch responses for");
      setResponses([]);
    }
  }, [sessions]);

  // Calculate overall response rate across all sessions
  const calculateOverallResponseRate = () => {
    if (sessions.length === 0) return 0;

    let totalAssignedStudents = 0;
    let totalRespondedStudents = 0;

    console.log("=== Response Rate Calculation Debug ===");
    console.log("Sessions:", sessions);
    console.log("Responses:", responses);

    sessions.forEach((session) => {
      // Use the assigned_students_count from the sessions table
      const sessionAssignedCount = session.assigned_students_count || 0;

      const sessionResponses = responses.filter(
        (response) => response.session_id === session.id
      );
      const uniqueSessionRespondents = new Set(
        sessionResponses.map((r) => r.student_id)
      );
      const uniqueRespondentsCount = uniqueSessionRespondents.size;

      console.log(`Session "${session.title}" (${session.id}):`);
      console.log(`  - Assigned students (from DB): ${sessionAssignedCount}`);
      console.log(`  - Unique respondents: ${uniqueRespondentsCount}`);
      console.log(`  - Session responses:`, sessionResponses);

      totalAssignedStudents += sessionAssignedCount;
      totalRespondedStudents += uniqueRespondentsCount;
    });

    console.log(`Total assigned: ${totalAssignedStudents}`);
    console.log(`Total responded: ${totalRespondedStudents}`);
    console.log(
      `Response rate: ${
        totalAssignedStudents > 0
          ? Math.round((totalRespondedStudents / totalAssignedStudents) * 100)
          : 0
      }%`
    );
    console.log("=== End Debug ===");

    return totalAssignedStudents > 0
      ? Math.round((totalRespondedStudents / totalAssignedStudents) * 100)
      : 0;
  };

  const responseRate = calculateOverallResponseRate();

  // Calculate active and completed sessions using expires_at
  const now = new Date();
  const activeSessionsCount = sessions.filter(
    (s) => s.expires_at && new Date(s.expires_at) > now
  ).length;
  const completedSessionsCount = sessions.filter(
    (s) => s.expires_at && new Date(s.expires_at) <= now
  ).length;

  // Calculate per-session stats for responses and students
  const sessionStats = sessions.map((session) => {
    const responded = new Set(
      responses
        .filter((r) => r.session_id === session.id)
        .map((r) => r.student_id)
    );
    return {
      ...session,
      responses: responded.size,
      students: session.assigned_students_count || 0,
    };
  });

  // Debug logging
  console.log("Teacher Dashboard Debug Info:", {
    sessions: sessions.length,
    totalAssigned: sessions.reduce(
      (sum, s) => sum + (s.assigned_students_count || 0),
      0
    ),
    responses: responses.length,
    responseRate,
    sessionStats: sessionStats.map((s) => ({
      id: s.id,
      title: s.title,
      assigned: s.students,
      responses: s.responses,
    })),
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <Clock className="h-4 w-4 text-orange-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-gray-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-orange-100 text-orange-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const deleteSession = async (sessionId: string, sessionTitle: string) => {
    // Confirm deletion
    const confirmed = window.confirm(
      `Are you sure you want to delete the session "${sessionTitle}"?\n\nThis will permanently delete:\n• The session\n• All questions\n• All student responses\n• All student assignments\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      // Delete in order: responses -> session_students -> questions -> session
      // 1. Delete responses
      const { error: responsesError } = await supabase
        .from("responses")
        .delete()
        .eq("session_id", sessionId);

      if (responsesError) {
        console.error("Error deleting responses:", responsesError);
        alert("Error deleting session responses. Please try again.");
        return;
      }

      // 2. Delete session_students assignments
      const { error: assignmentsError } = await supabase
        .from("session_students")
        .delete()
        .eq("session_id", sessionId);

      if (assignmentsError) {
        console.error("Error deleting assignments:", assignmentsError);
        alert("Error deleting session assignments. Please try again.");
        return;
      }

      // 3. Delete questions
      const { error: questionsError } = await supabase
        .from("questions")
        .delete()
        .eq("session_id", sessionId);

      if (questionsError) {
        console.error("Error deleting questions:", questionsError);
        alert("Error deleting session questions. Please try again.");
        return;
      }

      // 4. Delete the session
      const { error: sessionError } = await supabase
        .from("sessions")
        .delete()
        .eq("id", sessionId);

      if (sessionError) {
        console.error("Error deleting session:", sessionError);
        alert("Error deleting session. Please try again.");
        return;
      }

      // Update local state
      setSessions(sessions.filter((s) => s.id !== sessionId));

      // Show success message
      alert(`Session "${sessionTitle}" has been successfully deleted.`);
    } catch (error) {
      console.error("Error deleting session:", error);
      alert(
        "An unexpected error occurred while deleting the session. Please try again."
      );
    }
  };

  return (
    <Layout userType="teacher" userName={user.name} onLogout={onLogout}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Teacher Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your feedback sessions and view responses
            </p>
          </div>
          <Button
            onClick={() => navigate("/teacher/create-session")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Session
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Students
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {students.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    {activeSessionsCount === 1
                      ? "Active Session"
                      : "Active Sessions"}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {activeSessionsCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Completed Sessions
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {completedSessionsCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Overall Response Rate
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {responseRate}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Across all sessions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Feedback Sessions</CardTitle>
            <CardDescription>
              View and manage your feedback sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sessionStats.map((session) => {
                // Determine session status based on expires_at
                const now = new Date();
                const isActive =
                  session.expires_at && new Date(session.expires_at) > now;
                const isCompleted =
                  session.expires_at && new Date(session.expires_at) <= now;
                const status = isActive
                  ? "Active"
                  : isCompleted
                  ? "Completed"
                  : "Unknown";
                const statusColor = isActive
                  ? "bg-orange-100 text-orange-800"
                  : isCompleted
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800";
                return (
                  <div
                    key={session.id}
                    className="p-5 border rounded-xl bg-white shadow-sm flex flex-col space-y-4 hover:shadow-lg transition-shadow group cursor-pointer relative"
                    onClick={() =>
                      navigate(`/teacher/session-results/${session.id}`)
                    }
                  >
                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id, session.title);
                      }}
                      className="absolute top-2 right-2 p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                      title="Delete session"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(status.toLowerCase())}
                        <h3 className="font-semibold text-gray-900 truncate text-lg">
                          {session.title}
                        </h3>
                      </div>
                      <Badge className={statusColor}>{status}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>
                        <span className="font-medium text-gray-700">Code:</span>{" "}
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">
                          {session.code}
                        </span>
                      </span>
                      <span>
                        <span className="font-medium text-gray-700">
                          Responses:
                        </span>{" "}
                        <span className="font-bold text-green-700">
                          {session.responses}/{session.students}{" "}
                          {session.responses === 1 ? "response" : "responses"}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-400 mt-2">
                      <span>
                        Created:{" "}
                        {session.created_at
                          ? new Date(session.created_at).toLocaleString()
                          : "-"}
                      </span>
                      <span>
                        Expires:{" "}
                        {session.expires_at
                          ? new Date(session.expires_at).toLocaleString()
                          : "-"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Students List */}
        <Card>
          <CardHeader>
            <CardTitle>Enrolled Students</CardTitle>
            <CardDescription>Students enrolled in your courses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {students.map((student) => {
                const initials = student.name
                  ? student.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : "";
                return (
                  <div
                    key={student.id}
                    className="p-5 border rounded-xl bg-white shadow-sm flex items-center space-x-4 hover:shadow-lg transition-shadow group"
                  >
                    {student.avatar_url ? (
                      <img
                        src={student.avatar_url}
                        alt={student.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-blue-400 group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 text-white text-xl font-bold group-hover:scale-105 transition-transform">
                        {initials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {student.name}
                      </h4>
                      <p className="text-sm text-gray-500 truncate">
                        {student.email}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Enrolled:{" "}
                        {student.created_at
                          ? new Date(student.created_at).toLocaleDateString()
                          : "-"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default TeacherDashboard;

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
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Hash,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  filterActiveSessionsForStudents,
  getSessionTimeRemaining,
  validateSessionCode,
  Session,
} from "@/utils/sessionUtils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

interface StudentDashboardProps {
  user: any;
  onLogout?: () => void;
}

const StudentDashboard = ({ user, onLogout }: StudentDashboardProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessionCode, setSessionCode] = useState("");

  const [allSessions, setAllSessions] = useState<Session[]>([]);

  useEffect(() => {
    // Fetch sessions assigned to this student
    const fetchSessions = async () => {
      const { data, error } = await supabase
        .from("session_students")
        .select("session:sessions(*), status")
        .eq("student_id", user.id);
      if (!error && data) {
        setAllSessions(
          data.map((row: any) => ({
            ...row.session,
            status: row.status,
          }))
        );
      }
    };
    fetchSessions();
  }, [user.id]);

  // Filter out expired sessions for students
  const [availableSessions, setAvailableSessions] = useState<Session[]>([]);

  useEffect(() => {
    // Update available sessions every minute to handle expiry
    const updateSessions = () => {
      const activeSessions = filterActiveSessionsForStudents(allSessions);
      setAvailableSessions(activeSessions);
    };

    updateSessions();
    const interval = setInterval(updateSessions, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [allSessions]);

  const [enrolledSubjects] = useState([
    {
      id: 1,
      name: "Web Development",
      teacher: "Dr. Sarah Wilson",
      code: "WD2024",
    },
    {
      id: 2,
      name: "Database Systems",
      teacher: "Prof. Michael Chen",
      code: "DB2024",
    },
    {
      id: 3,
      name: "Software Engineering",
      teacher: "Dr. Emily Johnson",
      code: "SE2024",
    },
  ]);

  const handleJoinSession = async () => {
    if (sessionCode.length === 6) {
      // 1. Fetch session by code
      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .select("*")
        .eq("code", sessionCode.toString())
        .single();
      if (sessionError || !session) {
        toast({
          title: "Invalid Session Code",
          description: "No session found with this code.",
          variant: "destructive",
        });
        setSessionCode("");
        return;
      }
      // 2. Check expiry
      const now = new Date();
      const expiresAt = session.expires_at
        ? new Date(session.expires_at)
        : null;
      if (expiresAt && now > expiresAt) {
        toast({
          title: "Session Expired",
          description: "This session is no longer available.",
          variant: "destructive",
        });
        setSessionCode("");
        return;
      }
      // 3. Check if already assigned
      const { data: existing, error: existingError } = await supabase
        .from("session_students")
        .select("*")
        .eq("session_id", session.id)
        .eq("student_id", user.id)
        .single();
      if (!existing && !existingError) {
        // 4. Assign student to session
        const { error: assignError } = await supabase
          .from("session_students")
          .insert([
            { session_id: session.id, student_id: user.id, status: "pending" },
          ]);
        if (assignError) {
          toast({
            title: "Error Joining Session",
            description: assignError.message,
            variant: "destructive",
          });
          return;
        }
      }
      // 5. Navigate to feedback form
      navigate(`/student/feedback/${sessionCode}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-orange-100 text-orange-800";
      case "completed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const pendingSessions = availableSessions.filter(
    (s) => s.status === "pending"
  );
  const completedSessions = availableSessions.filter(
    (s) => s.status === "completed"
  );

  const [teachers, setTeachers] = useState<any[]>([]);

  useEffect(() => {
    const fetchTeachers = async () => {
      // Fetch all teachers from users table
      const { data: teacherData, error: teacherError } = await supabase
        .from("users")
        .select("id, name, email")
        .eq("role", "teacher");

      if (teacherError || !teacherData) {
        setTeachers([]);
        return;
      }

      setTeachers(teacherData);
    };

    fetchTeachers();
  }, []);

  return (
    <Layout userType="student" userName={user.name} onLogout={onLogout}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Student Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              View your feedback sessions and submit responses
            </p>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Hash className="h-4 w-4 mr-2" />
                Join Session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join Feedback Session</DialogTitle>
                <DialogDescription>
                  Enter the 6-digit session code provided by your teacher
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="session-code" className="text-sm font-medium">
                    Session Code
                  </label>
                  <Input
                    id="session-code"
                    placeholder="Enter 6-digit code"
                    value={sessionCode}
                    onChange={(e) => setSessionCode(e.target.value)}
                    maxLength={6}
                    className="text-center text-lg font-mono tracking-widest"
                  />
                </div>
                <Button
                  onClick={handleJoinSession}
                  disabled={sessionCode.length !== 6}
                  className="w-full"
                >
                  Join Session
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Teachers Block */}
        <Card>
          <CardHeader>
            <CardTitle>Your Teachers</CardTitle>
            <CardDescription>Teachers you are enrolled with</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teachers.map((teacher) => {
                const initials = teacher.name
                  ? teacher.name
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : "";
                return (
                  <div
                    key={teacher.id}
                    className="p-5 border rounded-xl bg-white shadow-sm flex items-center space-x-4 hover:shadow-lg transition-shadow group"
                  >
                    {teacher.avatar_url ? (
                      <img
                        src={teacher.avatar_url}
                        alt={teacher.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-green-400 group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-green-400 to-green-600 text-white text-xl font-bold group-hover:scale-105 transition-transform">
                        {initials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">
                        {teacher.name}
                      </h4>
                      <p className="text-sm text-gray-500 truncate">
                        {teacher.email}
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

export default StudentDashboard;

import React, { useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Upload,
  Trash2,
  Save,
  Mail,
  User as UserIcon,
  Image as ImageIcon,
  Lock,
  UserPlus,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import Layout from "@/components/Layout";

interface StudentProfileProps {
  user: {
    id: string;
    name: string;
    email: string;
    created_at?: string;
    avatar_url?: string;
  };
  onLogout?: () => void;
}

const StudentProfile: React.FC<StudentProfileProps> = ({ user, onLogout }) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || "");
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [enrolledTeachers, setEnrolledTeachers] = useState<any[]>([]);
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [enrollCode, setEnrollCode] = useState("");
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [enrollSuccess, setEnrollSuccess] = useState<string | null>(null);

  // Fetch enrolled teachers
  React.useEffect(() => {
    const fetchEnrolledTeachers = async () => {
      const { data, error } = await supabase
        .from("student_teachers")
        .select(
          `id, teacher:teacher_id(id, name, email, created_at, 
          sessions:sessions(id),
          students:student_teachers(id)
        )`
        )
        .eq("student_id", user.id);
      if (!error && data) {
        setEnrolledTeachers(
          data.map((row: any) => ({
            ...row.teacher,
            _enrollment_id: row.id, // for unenroll
            sessionsCount: row.teacher.sessions
              ? row.teacher.sessions.length
              : 0,
            studentsCount: row.teacher.students
              ? row.teacher.students.length
              : 0,
          }))
        );
      }
    };
    fetchEnrolledTeachers();
  }, [user.id]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setLoading(true);
    setErrorMsg(null);
    const fileExt = file.name.split(".").pop();
    const filePath = `avatars/${user.id}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });
    if (uploadError) {
      setErrorMsg(uploadError.message);
      setLoading(false);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    setAvatarUrl(data.publicUrl);
    // Update user profile
    await supabase
      .from("users")
      .update({ avatar_url: data.publicUrl })
      .eq("id", user.id);
    setInfoMsg("Profile picture updated!");
    setLoading(false);
  };

  const handleSave = async () => {
    setLoading(true);
    setErrorMsg(null);
    setInfoMsg(null);
    // Update name/email in users table
    const { error } = await supabase
      .from("users")
      .update({ name, email })
      .eq("id", user.id);
    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }
    // Update email in auth (if changed)
    if (email !== user.email) {
      const { error: authError } = await supabase.auth.updateUser({ email });
      if (authError) {
        setErrorMsg(authError.message);
        setLoading(false);
        return;
      }
    }
    setInfoMsg("Profile updated!");
    setLoading(false);
  };

  const handlePasswordReset = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) setErrorMsg(error.message);
    else setInfoMsg("Password reset email sent. Check your inbox.");
  };

  const handleDeleteAccount = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete your account? This action cannot be undone."
      )
    )
      return;
    setLoading(true);
    setErrorMsg(null);
    // Delete from users table
    const { error: userError } = await supabase
      .from("users")
      .delete()
      .eq("id", user.id);
    if (userError) {
      setErrorMsg(userError.message);
      setLoading(false);
      return;
    }
    // Delete from auth
    const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
    if (authError) {
      setErrorMsg(authError.message);
      setLoading(false);
      return;
    }
    setInfoMsg("Account deleted.");
    setLoading(false);
    // Optionally, redirect or log out
    window.location.href = "/";
  };

  const handleEnrollWithTeacher = async () => {
    setEnrollLoading(true);
    setEnrollError(null);
    setEnrollSuccess(null);
    // Get the current authenticated user
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      setEnrollError("You must be logged in to enroll.");
      setEnrollLoading(false);
      return;
    }
    const studentId = authData.user.id;
    // Insert into student_teachers
    const { error: enrollError } = await supabase
      .from("student_teachers")
      .insert({ student_id: studentId, teacher_id: user.id });
    if (enrollError) {
      if (enrollError.code === "23505") {
        setEnrollError("You are already enrolled with this teacher.");
      } else {
        setEnrollError(enrollError.message);
      }
      setEnrollLoading(false);
      return;
    }
    setEnrollSuccess(`Enrolled with teacher.`);
    setEnrollCode("");
    setEnrollLoading(false);
    setEnrollDialogOpen(false);
    // Refresh enrolled teachers
    const { data } = await supabase
      .from("student_teachers")
      .select(
        `id, teacher:teacher_id(id, name, email, created_at, 
        sessions:sessions(id),
        students:student_teachers(id)
      )`
      )
      .eq("student_id", studentId);
    if (data)
      setEnrolledTeachers(
        data.map((row: any) => ({
          ...row.teacher,
          _enrollment_id: row.id,
          sessionsCount: row.teacher.sessions ? row.teacher.sessions.length : 0,
          studentsCount: row.teacher.students ? row.teacher.students.length : 0,
        }))
      );
  };

  const handleUnenroll = async (enrollmentId: string) => {
    if (!window.confirm("Are you sure you want to unenroll from this teacher?"))
      return;
    await supabase.from("student_teachers").delete().eq("id", enrollmentId);
    // Refresh enrolled teachers
    const { data } = await supabase
      .from("student_teachers")
      .select(
        `id, teacher:teacher_id(id, name, email, created_at, 
        sessions:sessions(id),
        students:student_teachers(id)
      )`
      )
      .eq("student_id", user.id);
    if (data)
      setEnrolledTeachers(
        data.map((row: any) => ({
          ...row.teacher,
          _enrollment_id: row.id,
          sessionsCount: row.teacher.sessions ? row.teacher.sessions.length : 0,
          studentsCount: row.teacher.students ? row.teacher.students.length : 0,
        }))
      );
  };

  return (
    <Layout userType="student" userName={user.name} onLogout={onLogout}>
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
        <Card className="w-full max-w-2xl shadow-xl border-0 mt-2">
          <CardHeader className="text-center pb-0">
            <CardTitle className="text-3xl font-bold text-gray-900 mb-1">
              Student Profile
            </CardTitle>
            <CardDescription className="text-gray-600 mb-4">
              <br />
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex flex-col items-center space-y-3">
              <div className="relative w-32 h-32">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-32 h-32 rounded-full object-cover border-4 border-blue-400 shadow-lg"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-200 to-green-200 flex items-center justify-center border-4 border-blue-400 shadow-lg">
                    <ImageIcon className="h-16 w-16 text-gray-400" />
                  </div>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="absolute bottom-2 right-2 bg-white border shadow"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                >
                  <Upload className="h-5 w-5" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <span className="text-xs text-gray-500">Profile Picture</span>
            </div>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  className="w-full text-lg font-semibold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="w-full text-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Created
                </label>
                <Input
                  value={
                    user.created_at
                      ? new Date(user.created_at).toLocaleString()
                      : "-"
                  }
                  readOnly
                  className="w-full text-base"
                />
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-3 md:gap-6 justify-center items-center pt-2">
              <Button
                type="button"
                variant="default"
                onClick={handleSave}
                disabled={loading}
                className="w-full md:w-auto px-6 py-2 text-base"
              >
                <Save className="h-5 w-5 mr-2" /> Save Changes
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handlePasswordReset}
                disabled={loading}
                className="w-full md:w-auto px-6 py-2 text-base"
              >
                <Lock className="h-5 w-5 mr-2" /> Change Password
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={loading}
                className="w-full md:w-auto px-6 py-2 text-base"
              >
                <Trash2 className="h-5 w-5 mr-2" /> Delete Account
              </Button>
            </div>
            {infoMsg && (
              <div className="text-green-600 text-sm text-center">
                {infoMsg}
              </div>
            )}
            {errorMsg && (
              <div className="text-red-600 text-sm text-center">{errorMsg}</div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default StudentProfile;

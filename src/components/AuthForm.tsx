import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Mail, Lock, UserPlus, LogIn } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface AuthFormProps {
  onLogin: (userType: "teacher" | "student", userData: any) => void;
}

const AuthForm = ({ onLogin }: AuthFormProps) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });

  const [studentMode, setStudentMode] = useState<"signin" | "register">(
    "signin"
  );
  const [teacherMode, setTeacherMode] = useState<"signin" | "register">(
    "signin"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const handleSubmit = async (
    userType: "teacher" | "student",
    action: "signin" | "register"
  ) => {
    setErrorMsg(null);
    setInfoMsg(null);
    if (action === "register" && userType === "student") {
      // Student registration
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { name: formData.name, role: userType } },
      });
      if (error) {
        setErrorMsg(error.message);
        return;
      }
      setInfoMsg(
        "Registration successful! Please check your email and verify your account before logging in."
      );
      return;
    } else if (action === "register") {
      // Teacher registration
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { name: formData.name, role: userType } },
      });
      if (error) {
        setErrorMsg(error.message);
        return;
      }
      setInfoMsg(
        "Registration successful! Please check your email and go to main to verify your account before logging in."
      );
      // Do NOT insert into users table here; wait until login.
      return;
    } else if (action === "signin") {
      // Sign in with Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (error || !data.user) {
        setErrorMsg(error?.message || "Invalid credentials");
        return;
      }
      // Fetch user profile from users table
      let { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", data.user.id)
        .single();
      if (!userProfile) {
        // Insert profile now that session is established
        let insertData: any = {
          id: data.user.id,
          name: data.user.user_metadata?.name || formData.name || "",
          email: data.user.email,
          role: userType,
        };
        const { error: insertError } = await supabase
          .from("users")
          .upsert([insertData], { onConflict: "id" });
        if (insertError) {
          setErrorMsg(insertError.message);
          return;
        }
        // Fetch the profile again to get the inserted row
        const { data: newProfile } = await supabase
          .from("users")
          .select("*")
          .eq("id", data.user.id)
          .single();
        userProfile = newProfile;
      }
      if (!userProfile) {
        setErrorMsg("User profile not found.");
        return;
      }
      onLogin(userType, { ...userProfile, type: userType });
    }
  };

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      name: "",
    });
  };

  const handleForgotPassword = async () => {
    setErrorMsg(null);
    setInfoMsg(null);
    if (!formData.email) {
      setErrorMsg("Enter your email to reset password.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(formData.email);
    if (error) setErrorMsg(error.message);
    else setInfoMsg("Password reset email sent. Check your inbox.");
  };

  const handleKeyPress = (
    event: React.KeyboardEvent,
    userType: "teacher" | "student"
  ) => {
    if (event.key === "Enter") {
      const mode = userType === "student" ? studentMode : teacherMode;
      const isValid =
        formData.email &&
        formData.password &&
        (mode === "signin" || formData.name);

      if (isValid) {
        handleSubmit(userType, mode);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Welcome to FeedbackHub
          </CardTitle>
          <CardDescription>Connect, Learn, and Grow Together</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="student" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="student">Student</TabsTrigger>
              <TabsTrigger value="teacher">Teacher</TabsTrigger>
            </TabsList>

            <TabsContent value="student" className="space-y-4">
              <div className="flex gap-2 mb-4">
                <Button
                  variant={studentMode === "signin" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => {
                    setStudentMode("signin");
                    resetForm();
                  }}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
                <Button
                  variant={studentMode === "register" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => {
                    setStudentMode("register");
                    resetForm();
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Register
                </Button>
              </div>

              <div className="space-y-4">
                {studentMode === "register" && (
                  <div className="space-y-2">
                    <Label htmlFor="student-name">Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="student-name"
                        placeholder="Enter your name"
                        className="pl-10"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        onKeyPress={(e) => handleKeyPress(e, "student")}
                        required={studentMode === "register"}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="student-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="student-email"
                      type="email"
                      placeholder="Enter your email"
                      className="pl-10"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      onKeyPress={(e) => handleKeyPress(e, "student")}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="student-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="student-password"
                      type="password"
                      placeholder="Enter your password"
                      className="pl-10"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      onKeyPress={(e) => handleKeyPress(e, "student")}
                      required
                    />
                  </div>
                  {studentMode === "signin" && (
                    <button
                      type="button"
                      className="text-xs text-blue-600 underline mt-1"
                      onClick={handleForgotPassword}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  onClick={() => handleSubmit("student", studentMode)}
                  disabled={
                    !formData.email ||
                    !formData.password ||
                    (studentMode === "register" && !formData.name)
                  }
                >
                  {studentMode === "signin"
                    ? "Sign In as Student"
                    : "Register as Student"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="teacher" className="space-y-4">
              <div className="flex gap-2 mb-4">
                <Button
                  variant={teacherMode === "signin" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => {
                    setTeacherMode("signin");
                    resetForm();
                  }}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
                <Button
                  variant={teacherMode === "register" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => {
                    setTeacherMode("register");
                    resetForm();
                  }}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Register
                </Button>
              </div>

              <div className="space-y-4">
                {teacherMode === "register" && (
                  <div className="space-y-2">
                    <Label htmlFor="teacher-name">Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="teacher-name"
                        placeholder="Enter your name"
                        className="pl-10"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        onKeyPress={(e) => handleKeyPress(e, "teacher")}
                        required={teacherMode === "register"}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="teacher-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="teacher-email"
                      type="email"
                      placeholder="Enter your email"
                      className="pl-10"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      onKeyPress={(e) => handleKeyPress(e, "teacher")}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teacher-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="teacher-password"
                      type="password"
                      placeholder="Enter your password"
                      className="pl-10"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      onKeyPress={(e) => handleKeyPress(e, "teacher")}
                      required
                    />
                  </div>
                  {teacherMode === "signin" && (
                    <button
                      type="button"
                      className="text-xs text-blue-600 underline mt-1"
                      onClick={handleForgotPassword}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => handleSubmit("teacher", teacherMode)}
                  disabled={
                    !formData.email ||
                    !formData.password ||
                    (teacherMode === "register" && !formData.name)
                  }
                >
                  {teacherMode === "signin"
                    ? "Sign In as Teacher"
                    : "Register as Teacher"}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-center text-sm">
              {errorMsg}
            </div>
          )}
          {infoMsg && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-center text-sm">
              {infoMsg}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthForm;

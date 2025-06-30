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
  Copy,
  Upload,
  Trash2,
  Save,
  Mail,
  User as UserIcon,
  Image as ImageIcon,
  Lock,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Layout from "@/components/Layout";

interface TeacherProfileProps {
  user: {
    id: string;
    name: string;
    email: string;
    created_at?: string;
    avatar_url?: string;
  };
  onLogout?: () => void;
}

const TeacherProfile: React.FC<TeacherProfileProps> = ({ user, onLogout }) => {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url || "");
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <Layout userType="teacher" userName={user.name} onLogout={onLogout}>
      <div className="flex justify-center items-center min-h-[60vh] bg-gradient-to-br from-blue-50 to-green-50 p-4">
        <Card className="w-full max-w-3xl shadow-xl border-0">
          <CardHeader>
            <CardTitle>Teacher Profile</CardTitle>
            <CardDescription>
              Your account details and enrollment code
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {infoMsg && (
              <div className="text-green-600 text-sm text-center">
                {infoMsg}
              </div>
            )}
            {errorMsg && (
              <div className="text-red-600 text-sm text-center">{errorMsg}</div>
            )}
            <div className="flex flex-col items-center space-y-2">
              <div className="relative w-28 h-28">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="w-28 h-28 rounded-full object-cover border shadow"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-gray-200 flex items-center justify-center border shadow">
                    <ImageIcon className="h-12 w-12 text-gray-400" />
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
                  <Upload className="h-4 w-4" />
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
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  className="w-full"
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
                  className="w-full"
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
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-2 md:gap-4 justify-center items-center pt-2">
              <Button
                type="button"
                variant="default"
                onClick={handleSave}
                disabled={loading}
                className="w-full md:w-auto"
              >
                <Save className="h-4 w-4 mr-2" /> Save Changes
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handlePasswordReset}
                disabled={loading}
                className="w-full md:w-auto"
              >
                <Lock className="h-4 w-4 mr-2" /> Change Password
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={loading}
                className="w-full md:w-auto"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default TeacherProfile;

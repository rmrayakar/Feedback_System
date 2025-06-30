import React from "react";
import { Link, useLocation } from "react-router-dom";
import { User, LogOut, BookOpen, Users, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LayoutProps {
  children: React.ReactNode;
  userType?: "teacher" | "student";
  userName?: string;
  onLogout?: () => void;
}

const Layout = ({ children, userType, userName, onLogout }: LayoutProps) => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      <header className="fixed top-0 left-0 w-full z-50 backdrop-blur-md bg-white/70 border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <MessageSquare className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">
                FeedbackHub
              </span>
            </Link>
          </div>

          {userType && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {userType === "teacher" ? (
                  <Link to="/teacher/profile">
                    <User className="h-5 w-5 text-gray-500 hover:text-blue-600 cursor-pointer transition-colors" />
                  </Link>
                ) : (
                  <Link to="/student/profile">
                    <User className="h-5 w-5 text-gray-500 hover:text-blue-600 cursor-pointer transition-colors" />
                  </Link>
                )}
                <span className="text-sm text-gray-700">{userName}</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  {userType === "teacher" ? "Teacher" : "Student"}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={onLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;

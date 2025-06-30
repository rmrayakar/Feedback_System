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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Minus, Copy, Users, Calendar, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";

interface CreateSessionProps {
  user: any;
  onLogout?: () => void;
}

const CreateSession = ({ user, onLogout }: CreateSessionProps) => {
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState({
    title: "",
    description: "",
    dueDate: "",
    timeLimit: 30,
    selectedStudents: [] as number[],
  });

  const [customQuestions, setCustomQuestions] = useState([
    { text: "", type: "text", options: [""], scale: 5 },
  ]);
  const [generatedCode, setGeneratedCode] = useState("");
  const [isCustomTime, setIsCustomTime] = useState(false);
  const [customTimeValue, setCustomTimeValue] = useState("");

  const defaultQuestions = [
    "How clear was the session content?",
    "How would you rate the teaching pace?",
    "Was the session interactive enough?",
    "How well did the teacher explain complex concepts?",
    "Overall, how satisfied are you with this session?",
  ];

  const [selectedDefaultQuestions, setSelectedDefaultQuestions] = useState(
    defaultQuestions.map((_, index) => (index === 4 ? true : true)) // Satisfaction question (index 4) is always true
  );

  const [students, setStudents] = useState<any[]>([]);

  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Fetch all students from users table where role = 'student'
    const fetchStudents = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("role", "student");
      if (!error && data) {
        console.log("Fetched students:", data);
        setStudents(data);
      }
    };
    fetchStudents();
  }, []);

  const generateSessionCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
  };

  const addCustomQuestion = () => {
    setCustomQuestions([
      ...customQuestions,
      { text: "", type: "text", options: [""], scale: 5 },
    ]);
  };

  const removeCustomQuestion = (index: number) => {
    setCustomQuestions(customQuestions.filter((_, i) => i !== index));
  };

  const updateCustomQuestion = (index: number, field: string, value: any) => {
    const updated = [...customQuestions];
    updated[index][field] = value;
    setCustomQuestions(updated);
  };

  const updateCustomOption = (qIdx: number, optIdx: number, value: string) => {
    const updated = [...customQuestions];
    updated[qIdx].options[optIdx] = value;
    setCustomQuestions(updated);
  };

  const addCustomOption = (qIdx: number) => {
    const updated = [...customQuestions];
    updated[qIdx].options.push("");
    setCustomQuestions(updated);
  };

  const removeCustomOption = (qIdx: number, optIdx: number) => {
    const updated = [...customQuestions];
    updated[qIdx].options = updated[qIdx].options.filter(
      (_, i) => i !== optIdx
    );
    setCustomQuestions(updated);
  };

  const toggleStudent = (studentId: number) => {
    setSessionData((prev) => ({
      ...prev,
      selectedStudents: prev.selectedStudents.includes(studentId)
        ? prev.selectedStudents.filter((id) => id !== studentId)
        : [...prev.selectedStudents, studentId],
    }));
  };

  const selectAllStudents = () => {
    setSessionData((prev) => ({
      ...prev,
      selectedStudents:
        prev.selectedStudents.length === students.length
          ? []
          : students.map((s) => s.id),
    }));
  };

  const handleSubmit = async () => {
    if (!generatedCode) {
      generateSessionCode();
      return;
    }
    const createdAt = new Date();
    const expiresAt = new Date(
      createdAt.getTime() + sessionData.timeLimit * 60 * 1000
    );
    // Get the authenticated user's ID for teacher_id
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) {
      alert("You must be logged in as a teacher to create a session.");
      return;
    }
    const teacherId = authData.user.id;
    // 1. Insert session
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .insert([
        {
          title: sessionData.title,
          description: sessionData.description,
          code: generatedCode,
          teacher_id: teacherId,
          due_date: sessionData.dueDate,
          time_limit: sessionData.timeLimit,
          created_at: createdAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          assigned_students_count: sessionData.selectedStudents.length,
        },
      ])
      .select()
      .single();
    if (sessionError) {
      alert("Error creating session: " + sessionError.message);
      return;
    }
    // 2. Insert questions
    const defaultQs = defaultQuestions
      .map(
        (q, i) =>
          (selectedDefaultQuestions[i] || i === 4) && {
            // Always include satisfaction question (index 4)
            text: q,
            type: "rating",
            is_default: true,
          }
      )
      .filter(Boolean);
    const customQs = customQuestions
      .filter((q) => q.text.trim() !== "")
      .map((q) => ({
        text: q.text,
        type: q.type,
        is_default: false,
        options:
          q.type === "multiple-choice"
            ? q.options.filter((opt) => opt.trim() !== "")
            : null,
        scale: q.type === "rating" ? q.scale : null,
      }));
    const allQs = [...defaultQs, ...customQs].map((q) => ({
      ...q,
      session_id: session.id,
    }));
    console.log("Questions to insert:", allQs);
    if (allQs.length > 0) {
      const { error: qError } = await supabase.from("questions").insert(allQs);
      if (qError) {
        console.error("Insert error:", qError);
        alert("Error creating questions: " + qError.message);
        return;
      }
    }
    // 3. Assign students
    const studentRows = sessionData.selectedStudents.map((studentId) => ({
      session_id: session.id,
      student_id: studentId,
      status: "pending",
    }));
    if (studentRows.length > 0) {
      const { error: assignError } = await supabase
        .from("session_students")
        .insert(studentRows);
      if (assignError) {
        alert("Error assigning students: " + assignError.message);
        return;
      }
    }
    navigate("/teacher/dashboard");
  };

  return (
    <Layout userType="teacher" userName={user.name} onLogout={onLogout}>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Create Feedback Session
            </h1>
            <p className="text-gray-600 mt-1">
              Set up a new feedback session for your students
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/teacher/dashboard")}
          >
            Cancel
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Session Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Session Details</CardTitle>
                <CardDescription>
                  Basic information about your feedback session
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Session Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Introduction to React Hooks"
                    value={sessionData.title}
                    onChange={(e) =>
                      setSessionData({ ...sessionData, title: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the session content..."
                    value={sessionData.description}
                    onChange={(e) =>
                      setSessionData({
                        ...sessionData,
                        description: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate">Feedback Due Date *</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={sessionData.dueDate}
                    onChange={(e) =>
                      setSessionData({
                        ...sessionData,
                        dueDate: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeLimit">Session Time Limit *</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="predefined-time"
                        name="timeMode"
                        checked={!isCustomTime}
                        onChange={() => setIsCustomTime(false)}
                        className="text-blue-600"
                      />
                      <label
                        htmlFor="predefined-time"
                        className="text-sm font-medium"
                      >
                        Predefined Options
                      </label>
                    </div>

                    {!isCustomTime && (
                      <Select
                        value={sessionData.timeLimit.toString()}
                        onValueChange={(value) =>
                          setSessionData({
                            ...sessionData,
                            timeLimit: parseInt(value),
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select time limit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 minutes</SelectItem>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="45">45 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="90">1.5 hours</SelectItem>
                          <SelectItem value="120">2 hours</SelectItem>
                          <SelectItem value="180">3 hours</SelectItem>
                          <SelectItem value="240">4 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="custom-time"
                        name="timeMode"
                        checked={isCustomTime}
                        onChange={() => setIsCustomTime(true)}
                        className="text-blue-600"
                      />
                      <label
                        htmlFor="custom-time"
                        className="text-sm font-medium"
                      >
                        Custom Time
                      </label>
                    </div>

                    {isCustomTime && (
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          placeholder="Enter minutes"
                          value={customTimeValue}
                          onChange={(e) => {
                            const value = e.target.value;
                            setCustomTimeValue(value);
                            if (value && !isNaN(parseInt(value))) {
                              setSessionData({
                                ...sessionData,
                                timeLimit: parseInt(value),
                              });
                            }
                          }}
                          min="1"
                          max="1440"
                          className="w-32"
                        />
                        <span className="text-sm text-gray-600">minutes</span>
                        {customTimeValue &&
                          !isNaN(parseInt(customTimeValue)) && (
                            <span className="text-sm text-gray-500">
                              (
                              {parseInt(customTimeValue) >= 60
                                ? `${Math.floor(
                                    parseInt(customTimeValue) / 60
                                  )}h ${parseInt(customTimeValue) % 60}m`
                                : `${parseInt(customTimeValue)}m`}
                              )
                            </span>
                          )}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    Session will automatically expire after this time and become
                    unavailable to students
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Default Questions */}
            <Card>
              <CardHeader>
                <CardTitle>Default Questions</CardTitle>
                <CardDescription>
                  Select which default questions to include in your feedback
                  form
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {defaultQuestions.map((question, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <Checkbox
                      id={`default-${index}`}
                      checked={selectedDefaultQuestions[index]}
                      onCheckedChange={(checked) => {
                        const updated = [...selectedDefaultQuestions];
                        updated[index] = index === 4 ? true : !!checked; // Always keep satisfaction question checked
                        setSelectedDefaultQuestions(updated);
                      }}
                      disabled={index === 4}
                    />
                    <label
                      htmlFor={`default-${index}`}
                      className={`text-sm leading-6 cursor-pointer ${
                        index === 4 ? "text-gray-600" : ""
                      }`}
                    >
                      {question}
                      {index === 4 && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Compulsory
                        </span>
                      )}
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Custom Questions */}
            <Card>
              <CardHeader>
                <CardTitle>Custom Questions</CardTitle>
                <CardDescription>
                  Add your own questions specific to this session. Keep them
                  clear and concise for best feedback.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ol className="space-y-3">
                  {customQuestions.map((question, index) => (
                    <li
                      key={index}
                      className="flex flex-col space-y-2 bg-gray-50 rounded-lg p-3"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-400 font-bold w-6 text-center">
                          {index + 1}.
                        </span>
                        <Input
                          placeholder={`Custom question ${index + 1}...`}
                          value={question.text}
                          onChange={(e) =>
                            updateCustomQuestion(index, "text", e.target.value)
                          }
                          className="flex-1 bg-white"
                        />
                        <select
                          value={question.type}
                          onChange={(e) =>
                            updateCustomQuestion(index, "type", e.target.value)
                          }
                          className="ml-2 border rounded px-2 py-1 text-sm"
                        >
                          <option value="text">Text</option>
                          <option value="rating">Rating</option>
                          <option value="multiple-choice">
                            Multiple Choice
                          </option>
                        </select>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCustomQuestion(index)}
                          disabled={customQuestions.length === 1}
                          className="ml-1 text-red-500 hover:bg-red-50"
                          title="Remove question"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                      {/* Show options for multiple-choice */}
                      {question.type === "multiple-choice" && (
                        <div className="pl-8 space-y-2">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xs text-gray-500">
                              Options:
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addCustomOption(index)}
                            >
                              <Plus className="h-3 w-3 mr-1" /> Add Option
                            </Button>
                          </div>
                          {question.options.map((opt, optIdx) => (
                            <div
                              key={optIdx}
                              className="flex items-center space-x-2 mb-1"
                            >
                              <Input
                                placeholder={`Option ${optIdx + 1}`}
                                value={opt}
                                onChange={(e) =>
                                  updateCustomOption(
                                    index,
                                    optIdx,
                                    e.target.value
                                  )
                                }
                                className="flex-1 bg-white"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  removeCustomOption(index, optIdx)
                                }
                                disabled={question.options.length === 1}
                                className="text-red-400 hover:bg-red-50"
                                title="Remove option"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Show scale for rating */}
                      {question.type === "rating" && (
                        <div className="pl-8 flex items-center space-x-2">
                          <span className="text-xs text-gray-500">Scale:</span>
                          <select
                            value={question.scale.toString()}
                            onChange={(e) =>
                              updateCustomQuestion(
                                index,
                                "scale",
                                e.target.value
                              )
                            }
                            className="border rounded px-2 py-1 text-sm"
                          >
                            <option value="5">1-5</option>
                            <option value="10">1-10</option>
                          </select>
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
                <Button
                  variant="outline"
                  onClick={addCustomQuestion}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Question
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  Tip: Use open-ended questions to encourage detailed feedback.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Student Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Select Students
                </CardTitle>
                <CardDescription>
                  Choose which students should receive this feedback session
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllStudents}
                  className="w-full"
                >
                  {sessionData.selectedStudents.length === students.length
                    ? "Deselect All"
                    : "Select All"}
                </Button>

                <div className="space-y-2">
                  {students.length === 0 ? (
                    <div className="text-gray-500 text-sm">
                      No students found.
                    </div>
                  ) : (
                    students.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`student-${student.id}`}
                          checked={
                            !!sessionData.selectedStudents.includes(student.id)
                          }
                          onCheckedChange={(checked) => {
                            if (checked === true) {
                              setSessionData((prev) => ({
                                ...prev,
                                selectedStudents: [
                                  ...prev.selectedStudents,
                                  student.id,
                                ],
                              }));
                            } else {
                              setSessionData((prev) => ({
                                ...prev,
                                selectedStudents: prev.selectedStudents.filter(
                                  (id) => id !== student.id
                                ),
                              }));
                            }
                          }}
                        />
                        <label
                          htmlFor={`student-${student.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {student.name}
                        </label>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-2 border-t">
                  <Badge variant="secondary">
                    {sessionData.selectedStudents.length} selected
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Session Code */}
            <Card>
              <CardHeader>
                <CardTitle>Session Code</CardTitle>
                <CardDescription>
                  Generate a unique code for students to join this session
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {generatedCode ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-blue-50 rounded-lg text-center">
                      <p className="text-2xl font-bold font-mono text-blue-900">
                        {generatedCode}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`w-full flex items-center justify-center ${
                        copied ? "bg-green-100 text-green-800" : ""
                      }`}
                      onClick={async () => {
                        await navigator.clipboard.writeText(generatedCode);
                        setCopied(true);
                        toast({
                          title: "Copied!",
                          description: "Session code copied to clipboard.",
                        });
                        setTimeout(() => setCopied(false), 1500);
                      }}
                      disabled={copied}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      {copied ? "Copied" : "Copy Code"}
                    </Button>
                  </div>
                ) : (
                  <Button onClick={generateSessionCode} className="w-full">
                    Generate Code
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Time Limit Preview */}
            {sessionData.timeLimit && (
              <Card className="border-amber-200 bg-amber-50">
                <CardHeader>
                  <CardTitle className="flex items-center text-amber-800">
                    <Clock className="h-5 w-5 mr-2" />
                    Session Expiry
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-amber-700">
                    This session will automatically expire{" "}
                    <strong>{sessionData.timeLimit} minutes</strong> after
                    creation.
                  </p>
                  <p className="text-xs text-amber-600 mt-2">
                    After expiry, students won't be able to access or submit
                    feedback for this session.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Create Session */}
            <Card>
              <CardContent className="pt-6">
                <Button
                  onClick={handleSubmit}
                  disabled={
                    !sessionData.title ||
                    !sessionData.dueDate ||
                    sessionData.selectedStudents.length === 0
                  }
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Create Session
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CreateSession;

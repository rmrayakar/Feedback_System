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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Star, Send, ArrowLeft, AlertTriangle } from "lucide-react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { validateSessionCode, Session } from "@/utils/sessionUtils";
import { supabase } from "@/lib/supabaseClient";

interface FeedbackFormProps {
  user: any;
}

const FeedbackForm = ({ user }: FeedbackFormProps) => {
  // All hooks at the top
  const navigate = useNavigate();
  const { sessionCode } = useParams();
  const [sessionExpired, setSessionExpired] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [responses, setResponses] = useState<any>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  useEffect(() => {
    const fetchSessionAndQuestions = async () => {
      if (!sessionCode) return;
      // Sanitize sessionCode to remove any leading colon
      const cleanSessionCode = sessionCode.replace(/^:/, "");
      // Fetch session by code
      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .select("*")
        .eq("code", cleanSessionCode)
        .single();
      if (sessionError || !session) return setSessionExpired(true);
      setSessionData(session);
      // Fetch questions for this session
      const { data: qs, error: qError } = await supabase
        .from("questions")
        .select("*")
        .eq("session_id", session.id);
      if (!qError && qs) {
        console.log("Fetched questions:", qs);
        setQuestions(qs);
      }
      // Expiry check in UTC
      const now = new Date();
      const expiresAt = session.expires_at
        ? new Date(session.expires_at)
        : null;
      if (expiresAt && now > expiresAt) {
        setSessionExpired(true);
      }
      // Check if student already submitted feedback
      const { data: existingResponses, error: respError } = await supabase
        .from("responses")
        .select("id")
        .eq("session_id", session.id)
        .eq("student_id", user.id)
        .limit(1);
      if (existingResponses && existingResponses.length > 0) {
        setAlreadySubmitted(true);
      }
    };
    fetchSessionAndQuestions();
  }, [sessionCode]);

  // All conditional returns after hooks
  if (!user) {
    return <Navigate to="/" replace />;
  }
  if (!sessionData && !sessionExpired) {
    return (
      <Layout userType="student" userName={user.name}>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-gray-500 text-lg">Loading session...</div>
        </div>
      </Layout>
    );
  }
  if (sessionExpired) {
    return (
      <Layout userType="student" userName={user.name}>
        <div className="max-w-3xl mx-auto space-y-6">
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-red-800">Session Expired</CardTitle>
              <CardDescription className="text-red-600">
                This feedback session has expired and is no longer available.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-gray-600">
                Session Code:{" "}
                <span className="font-mono font-bold">{sessionCode}</span>
              </p>
              <p className="text-sm text-gray-500">
                The time limit for this session has been reached. Please contact
                your teacher if you need assistance.
              </p>
              <Button
                onClick={() => navigate("/student/dashboard")}
                className="mt-4"
              >
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }
  if (alreadySubmitted) {
    return (
      <Layout userType="student" userName={user.name}>
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-green-600 text-lg font-semibold">
            You have already submitted feedback for this session.
          </div>
        </div>
      </Layout>
    );
  }

  const handleResponse = (questionId: number, value: any) => {
    setResponses((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = async () => {
    if (!sessionData) return;
    const rows = Object.entries(responses).map(([question_id, response]) => ({
      session_id: sessionData.id,
      student_id: user.id,
      question_id,
      response: typeof response === "string" ? response : String(response),
    }));
    if (rows.length > 0) {
      const { error } = await supabase.from("responses").insert(rows);
      if (error) {
        alert("Error submitting feedback: " + error.message);
        return;
      }
    }
    navigate("/student/dashboard");
  };

  const renderQuestion = (question: any) => {
    switch (question.type) {
      case "rating":
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  onClick={() => handleResponse(question.id, rating)}
                  className={`p-2 rounded-full transition-colors ${
                    responses[question.id] >= rating
                      ? "text-yellow-500"
                      : "text-gray-300 hover:text-yellow-400"
                  }`}
                >
                  <Star className="h-8 w-8 fill-current" />
                </button>
              ))}
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>Poor</span>
              <span>Excellent</span>
            </div>
          </div>
        );

      case "multiple-choice":
        if (!Array.isArray(question.options)) {
          return (
            <div className="text-red-600 text-center">
              Invalid or missing options for multiple-choice question.
            </div>
          );
        }
        return (
          <RadioGroup
            value={responses[question.id] || ""}
            onValueChange={(value) => handleResponse(question.id, value)}
            className="space-y-3"
          >
            {question.options.map((option: string, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${question.id}-${index}`} />
                <Label
                  htmlFor={`${question.id}-${index}`}
                  className="cursor-pointer"
                >
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "text":
        return (
          <Textarea
            placeholder="Please share your thoughts..."
            value={responses[question.id] || ""}
            onChange={(e) => handleResponse(question.id, e.target.value)}
            className="min-h-[100px]"
          />
        );

      default:
        return null;
    }
  };

  const isCurrentQuestionAnswered = () => {
    const currentQ = questions[currentQuestion];
    if (!currentQ) return false;
    const response = responses[currentQ.id];
    return response !== undefined && response !== "" && response !== null;
  };

  const completedQuestions = Object.keys(responses).length;
  const progress = (completedQuestions / questions.length) * 100;

  return (
    <Layout userType="student" userName={user.name}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Feedback Session</h1>
          <p className="text-gray-600">
            Session Code:{" "}
            <span className="font-mono font-bold">{sessionCode}</span>
          </p>
        </div>

        {/* Session Info */}
        <Card>
          <CardHeader>
            <CardTitle>{sessionData?.title}</CardTitle>
            <CardDescription>
              {sessionData?.teacher} • {sessionData?.subject}
            </CardDescription>
          </CardHeader>
          {sessionData?.description && (
            <CardContent>
              <p className="text-gray-600">{sessionData.description}</p>
            </CardContent>
          )}
        </Card>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>
              Question {currentQuestion + 1} of {questions.length}
            </span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {questions[currentQuestion]?.text}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {questions[currentQuestion] && questions[currentQuestion].type ? (
              renderQuestion(questions[currentQuestion])
            ) : (
              <div className="text-red-600 text-center">
                Invalid or missing question data.
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={prevQuestion}
                disabled={currentQuestion === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {currentQuestion === questions.length - 1 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={completedQuestions < questions.length}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit Feedback
                </Button>
              ) : (
                <Button
                  onClick={nextQuestion}
                  disabled={!isCurrentQuestionAnswered()}
                >
                  Next
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Navigation Dots */}
        <div className="flex justify-center space-x-2">
          {questions.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuestion(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentQuestion
                  ? "bg-blue-600"
                  : responses[questions[index].id] !== undefined
                  ? "bg-green-400"
                  : "bg-gray-300"
              }`}
            />
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default FeedbackForm;

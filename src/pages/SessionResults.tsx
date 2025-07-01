import React, { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Star, Users, Calendar, TrendingUp, Clock, Copy } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface SessionResultsProps {
  user: any;
  onLogout?: () => void;
}

const SessionResults = ({ user, onLogout }: SessionResultsProps) => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      if (!sessionId) return;
      // Fetch session
      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();
      if (!session || sessionError) return;
      setSessionData(session);
      // Fetch questions
      const { data: qs } = await supabase
        .from("questions")
        .select("*")
        .eq("session_id", sessionId);
      setQuestions(qs || []);
      // Fetch responses
      const { data: rs } = await supabase
        .from("responses")
        .select("*")
        .eq("session_id", sessionId);
      setResponses(rs || []);
      console.log("Responses fetched:", rs);
    };
    fetchResults();
  }, [sessionId]);

  // Aggregate real data for charts
  const ratingQuestions = questions.filter((q) => q.type === "rating");
  const mcQuestions = questions.filter((q) => q.type === "multiple-choice");
  const textQuestions = questions.filter((q) => q.type === "text");

  console.log("Questions:", questions);
  console.log("Rating questions:", ratingQuestions);
  console.log("MC questions:", mcQuestions);
  console.log("Text questions:", textQuestions);
  console.log("Responses:", responses);

  const ratingChartData = ratingQuestions.map((q) => {
    const qResponses = responses.filter((r) => r.question_id === q.id);
    const avg = qResponses.length
      ? qResponses.reduce((sum, r) => sum + Number(r.response), 0) /
        qResponses.length
      : 0;
    return {
      question: q.text,
      average: avg,
      responses: qResponses.length,
    };
  });

  const mcChartData = mcQuestions.map((q) => {
    const qResponses = responses.filter((r) => r.question_id === q.id);
    const optionCounts = {};
    (q.options || []).forEach((opt) => {
      optionCounts[opt] = 0;
    });
    qResponses.forEach((r) => {
      optionCounts[r.response] = (optionCounts[r.response] || 0) + 1;
    });
    return {
      question: q.text,
      options: optionCounts,
    };
  });

  const textFeedback = textQuestions.map((q) => ({
    question: q.text,
    responses: responses
      .filter((r) => r.question_id === q.id)
      .map((r) => r.response),
  }));

  const renderStars = (rating: number) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "text-yellow-500 fill-current" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  const totalAssigned = sessionData?.assigned_students_count || 0;
  const questionCount = questions.length;

  // Map student_id to number of responses
  const studentResponseCounts = responses.reduce((acc, r) => {
    acc[r.student_id] = (acc[r.student_id] || 0) + 1;
    return acc;
  }, {});

  // Count students who answered all questions
  const fullyRespondedCount = Object.values(studentResponseCounts).filter(
    (count) => count === questionCount
  ).length;

  const responseRate = totalAssigned
    ? (fullyRespondedCount / totalAssigned) * 100
    : 0;

  // Compute overall average rating across all rating questions
  const allRatingResponses = ratingQuestions.flatMap((q) =>
    responses.filter((r) => r.question_id === q.id)
  );
  const overallAvgRating = allRatingResponses.length
    ? allRatingResponses.reduce((sum, r) => sum + Number(r.response), 0) /
      allRatingResponses.length
    : 0;

  // Compute satisfaction as percentage of ratings >= 4
  const satisfiedCount = allRatingResponses.filter(
    (r) => Number(r.response) >= 4
  ).length;
  const satisfaction = allRatingResponses.length
    ? (satisfiedCount / allRatingResponses.length) * 100
    : 0;

  return (
    <Layout userType="teacher" userName={user.name} onLogout={onLogout}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Session Results
            </h1>
            <p className="text-gray-600 mt-1">{sessionData?.title}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">Code: {sessionData?.code}</Badge>
            {sessionData?.code && (
              <button
                className={`flex items-center px-2 py-1 border rounded transition text-sm ${
                  copied ? "bg-green-100 text-green-800" : "hover:bg-gray-100"
                }`}
                onClick={async () => {
                  await navigator.clipboard.writeText(sessionData.code);
                  setCopied(true);
                  toast({
                    title: "Copied!",
                    description: "Session code copied to clipboard.",
                  });
                  setTimeout(() => setCopied(false), 1500);
                }}
                title="Copy session code"
                type="button"
                disabled={copied}
              >
                <Copy className="h-4 w-4 mr-1" />
                {copied ? "Copied" : "Copy"}
              </button>
            )}
            <Badge className="bg-green-100 text-green-800">
              {fullyRespondedCount}{" "}
              {fullyRespondedCount === 1 ? "response" : "responses"}
            </Badge>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Response Rate
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round(responseRate)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Star className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Avg. Rating
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {overallAvgRating.toFixed(2)}/5
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Session Date
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {sessionData?.created_at &&
                      new Date(sessionData.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Session Time
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {sessionData?.created_at &&
                      new Date(sessionData.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Satisfaction
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round(satisfaction)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Response Completion Progress Bar */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Progress value={responseRate} className="h-3 w-full" />
              <span className="ml-4 text-lg font-bold text-gray-900">
                {Math.round(responseRate)}%
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {fullyRespondedCount} of {totalAssigned} students completed
              feedback
            </p>
          </CardContent>
        </Card>

        {/* Per-Question Response Distribution for Rating Questions */}
        {ratingQuestions.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded"></div>
              <h2 className="text-xl font-bold text-gray-900">
                Rating Questions
              </h2>
            </div>
            {ratingQuestions.map((q) => {
              const qResponses = responses.filter(
                (r) => r.question_id === q.id
              );
              const scale = q.scale || 5;
              const distribution = Array.from({ length: scale }, (_, i) => ({
                rating: i + 1,
                count: qResponses.filter((r) => Number(r.response) === i + 1)
                  .length,
              }));
              const avg = qResponses.length
                ? qResponses.reduce((sum, r) => sum + Number(r.response), 0) /
                  qResponses.length
                : 0;
              const totalResponses = qResponses.length;
              const maxCount = Math.max(...distribution.map((d) => d.count));

              return (
                <Card
                  key={q.id}
                  className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50"
                >
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg text-gray-800">
                      {q.text}
                    </CardTitle>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-600">
                            {avg.toFixed(1)}
                          </div>
                          <div className="text-sm text-gray-500">Average</div>
                        </div>
                        <div className="flex items-center space-x-1">
                          {[...Array(Math.round(avg))].map((_, i) => (
                            <Star
                              key={i}
                              className="h-6 w-6 text-yellow-400 fill-current"
                            />
                          ))}
                          {[...Array(scale - Math.round(avg))].map((_, i) => (
                            <Star
                              key={i + Math.round(avg)}
                              className="h-6 w-6 text-gray-300"
                            />
                          ))}
                        </div>
                        <div className="text-sm text-gray-500">/ {scale}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          {totalResponses}
                        </div>
                        <div className="text-sm text-gray-500">Responses</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {distribution.map((item) => {
                        const percentage =
                          maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                        const responsePercentage =
                          totalResponses > 0
                            ? (item.count / totalResponses) * 100
                            : 0;
                        return (
                          <div
                            key={item.rating}
                            className="flex items-center space-x-3"
                          >
                            <div className="w-8 text-center font-semibold text-gray-600">
                              {item.rating}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <div className="flex-1 bg-gray-200 rounded-full h-3">
                                  <div
                                    className="bg-gradient-to-r from-blue-400 to-purple-500 h-3 rounded-full transition-all duration-500"
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                                <div className="w-12 text-right text-sm font-medium text-gray-700">
                                  {item.count}
                                </div>
                                <div className="w-16 text-right text-xs text-gray-500">
                                  ({responsePercentage.toFixed(0)}%)
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Per-Question Response Distribution for Multiple-Choice Questions */}
        {mcQuestions.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-8 bg-gradient-to-b from-green-500 to-teal-600 rounded"></div>
              <h2 className="text-xl font-bold text-gray-900">
                Multiple Choice Questions
              </h2>
            </div>
            {mcQuestions.map((q) => {
              const qResponses = responses.filter(
                (r) => r.question_id === q.id
              );
              const optionCounts = {};
              (q.options || []).forEach((opt) => {
                optionCounts[opt] = 0;
              });
              qResponses.forEach((r) => {
                optionCounts[r.response] = (optionCounts[r.response] || 0) + 1;
              });
              const distribution = Object.entries(optionCounts).map(
                ([option, count]) => ({
                  option,
                  count: Number(count),
                })
              );
              const total = distribution.reduce((sum, d) => sum + d.count, 0);
              const COLORS = [
                "from-emerald-400 to-teal-500",
                "from-blue-400 to-indigo-500",
                "from-purple-400 to-pink-500",
                "from-orange-400 to-red-500",
                "from-yellow-400 to-orange-500",
                "from-pink-400 to-rose-500",
                "from-indigo-400 to-purple-500",
                "from-cyan-400 to-blue-500",
              ];

              return (
                <Card
                  key={q.id}
                  className="border-0 shadow-lg bg-gradient-to-br from-white to-green-50"
                >
                  <CardHeader>
                    <CardTitle className="text-lg text-gray-800">
                      {q.text}
                    </CardTitle>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {total}
                      </div>
                      <div className="text-sm text-gray-500">
                        Total Responses
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={distribution}
                              dataKey="count"
                              nameKey="option"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              innerRadius={40}
                              label={({ option, percent }) =>
                                `${(percent * 100).toFixed(0)}%`
                              }
                            >
                              {distribution.map((entry, idx) => (
                                <Cell
                                  key={`cell-${idx}`}
                                  className={`bg-gradient-to-r ${
                                    COLORS[idx % COLORS.length]
                                  }`}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "rgba(255, 255, 255, 0.95)",
                                border: "1px solid #e5e7eb",
                                borderRadius: "8px",
                                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="space-y-3">
                        {distribution.map((d, idx) => {
                          const percentage =
                            total > 0 ? (d.count / total) * 100 : 0;
                          return (
                            <div
                              key={d.option}
                              className="flex items-center space-x-3 p-3 bg-white rounded-lg shadow-sm"
                            >
                              <div
                                className={`w-4 h-4 rounded-full bg-gradient-to-r ${
                                  COLORS[idx % COLORS.length]
                                }`}
                              ></div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-800">
                                  {d.option}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {d.count} responses
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-gray-900">
                                  {percentage.toFixed(0)}%
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Text Feedback Responses */}
        {textQuestions.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-8 bg-gradient-to-b from-purple-500 to-pink-600 rounded"></div>
              <h2 className="text-xl font-bold text-gray-900">Text Feedback</h2>
            </div>
            {textQuestions.map((q) => {
              const qResponses = responses.filter(
                (r) => r.question_id === q.id
              );
              return (
                <Card
                  key={q.id}
                  className="border-0 shadow-lg bg-gradient-to-br from-white to-purple-50"
                >
                  <CardHeader>
                    <CardTitle className="text-lg text-gray-800">
                      {q.text}
                    </CardTitle>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-600">
                        {qResponses.length}
                      </div>
                      <div className="text-sm text-gray-500">
                        Text Responses
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {qResponses.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-gray-400 text-lg">
                          No text responses yet.
                        </div>
                        <div className="text-gray-400 text-sm mt-1">
                          Students haven't provided written feedback for this
                          question.
                        </div>
                      </div>
                    ) : (
                      <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
                        {qResponses.map((r, idx) => (
                          <div
                            key={idx}
                            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center font-bold text-white text-sm">
                                {typeof r.student_name === "string" &&
                                r.student_name.length > 0
                                  ? r.student_name[0].toUpperCase()
                                  : "S"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-gray-800 leading-relaxed">
                                  {String(r.response)}
                                </div>
                                {r.submitted_at && (
                                  <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                                    <Clock className="h-3 w-3" />
                                    <span>
                                      {new Date(
                                        r.submitted_at
                                      ).toLocaleString()}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* No Questions Message */}
        {questions.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-500 text-lg">
                No questions found for this session.
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Responses Message */}
        {questions.length > 0 && responses.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-500 text-lg">
                No responses yet. Students haven't submitted feedback for this
                session.
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feedback Submission Timeline */}
        {responses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Feedback Submission Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart
                  data={(() => {
                    // Map each student to their latest (last) submission time
                    const studentLastSubmission: Record<string, Date> = {};
                    responses.forEach((r) => {
                      if (!r.student_id || !r.submitted_at) return;
                      const prev = studentLastSubmission[r.student_id];
                      const currTime = new Date(r.submitted_at);
                      if (!prev || currTime > prev) {
                        studentLastSubmission[r.student_id] = currTime;
                      }
                    });
                    // Bucket by hour
                    const timelineBuckets = Object.values(studentLastSubmission)
                      .map((dateObj) => {
                        return dateObj instanceof Date && !isNaN(dateObj as any)
                          ? { date: format(dateObj, "yyyy-MM-dd HH:00") }
                          : null;
                      })
                      .filter(Boolean)
                      .reduce((acc, obj) => {
                        const date = (obj as { date: string }).date;
                        acc[date] = (acc[date] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);
                    return Object.entries(timelineBuckets).map(
                      ([date, count]) => ({
                        date,
                        count,
                      })
                    );
                  })()}
                >
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#10b981" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Satisfaction Gauge */}
        <Card>
          <CardHeader>
            <CardTitle>Satisfaction Gauge</CardTitle>
            <CardDescription>
              Percentage of students who rated 4 or 5 stars
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <div className="relative">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Satisfied", value: Math.round(satisfaction) },
                        {
                          name: "Neutral/Dissatisfied",
                          value: 100 - Math.round(satisfaction),
                        },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <Cell key="satisfied" fill="#10b981" />
                      <Cell key="other" fill="#e5e7eb" />
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [`${value}%`, name]}
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-900">
                      {Math.round(satisfaction)}%
                    </div>
                    <div className="text-sm text-gray-500">Satisfied</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <div className="flex items-center justify-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">Satisfied (4-5 stars)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                  <span className="text-gray-600">
                    Neutral/Dissatisfied (1-3 stars)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SessionResults;

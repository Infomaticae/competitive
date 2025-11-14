import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, BookOpen, RotateCcw, Sparkles, Home } from "lucide-react";
import type { ExamAttempt } from "@shared/schema";
import ReactMarkdown from 'react-markdown';

export default function AIExamResult() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/ai-exam-result/:attemptId");
  const attemptId = params?.attemptId;

  const { data: attempt, isLoading } = useQuery<ExamAttempt>({
    queryKey: ["/api/exam-attempt", attemptId],
    queryFn: async () => {
      const response = await fetch(`/api/exam-attempt/${attemptId}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch attempt");
      return await response.json();
    },
    enabled: !!attemptId,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">Result Not Found</h2>
        <p className="text-muted-foreground mb-6">The requested exam result could not be found.</p>
        <Button onClick={() => setLocation("/dashboard")} data-testid="button-back-to-dashboard">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const isPassed = attempt.percentage >= 95;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-8 h-8 text-chart-1" />
          <h1 className="text-3xl md:text-4xl font-bold">AI Practice Test Results</h1>
        </div>
        <p className="text-muted-foreground text-lg">Your personalized performance report</p>
      </div>

      {/* Score Card */}
      <Card className={isPassed ? "border-chart-2" : "border-chart-4"}>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl mb-2">Your Score</CardTitle>
              <CardDescription>
                {isPassed 
                  ? "Excellent work! Keep up the great practice." 
                  : "Good effort! Review the suggestions below to improve."}
              </CardDescription>
            </div>
            <Badge 
              variant={isPassed ? "default" : "secondary"}
              className="text-lg px-4 py-2"
              data-testid="badge-result"
            >
              {attempt.percentage}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Correct Answers</span>
              <span className="font-medium" data-testid="text-score">
                {attempt.score} / {attempt.totalQuestions}
              </span>
            </div>
            <Progress 
              value={attempt.percentage} 
              className={`h-3 ${isPassed ? "bg-chart-2/20" : "bg-chart-4/20"}`}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            {isPassed ? (
              <>
                <Trophy className="w-5 h-5 text-chart-2" />
                <span className="text-chart-2 font-medium">Great Performance!</span>
              </>
            ) : (
              <>
                <BookOpen className="w-5 h-5 text-chart-4" />
                <span className="text-chart-4 font-medium">Room for Improvement</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI-Generated Revision Content */}
      {attempt.revisionContent && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-chart-1" />
              <CardTitle>Personalized Learning Recommendations</CardTitle>
            </div>
            <CardDescription>
              AI-generated insights based on your performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none" data-testid="text-revision-content">
              <ReactMarkdown>{attempt.revisionContent}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Button
          variant="outline"
          onClick={() => setLocation("/dashboard")}
          data-testid="button-dashboard"
        >
          <Home className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        
        <Button
          onClick={() => setLocation("/curriculum")}
          data-testid="button-study"
        >
          <BookOpen className="w-4 h-4 mr-2" />
          Study Materials
        </Button>
      </div>
    </div>
  );
}

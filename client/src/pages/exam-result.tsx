import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, XCircle, BookOpen, ArrowRight, Target, Clock } from "lucide-react";
import type { ExamAttempt } from "@shared/schema";

export default function ExamResult() {
  const [, params] = useRoute("/exam-result/:id");
  const [, setLocation] = useLocation();

  const { data: attempt, isLoading } = useQuery<ExamAttempt>({
    queryKey: ["/api/exam-attempt", params?.id],
    enabled: !!params?.id,
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
      <div className="max-w-2xl mx-auto text-center py-12">
        <Card>
          <CardHeader>
            <CardTitle>Result Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/")} data-testid="button-back">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const percentageColor = attempt.passed ? "text-chart-2" : "text-destructive";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Result Header */}
      <Card className={attempt.passed ? "border-chart-2/30" : "border-destructive/30"}>
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            {attempt.passed ? (
              <div className="w-20 h-20 rounded-full bg-chart-2/10 flex items-center justify-center">
                <Trophy className="w-10 h-10 text-chart-2" />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="w-10 h-10 text-destructive" />
              </div>
            )}
          </div>
          <CardTitle className="text-3xl md:text-4xl mb-2">
            {attempt.passed ? "Congratulations! 🎉" : "Keep Learning!"}
          </CardTitle>
          <CardDescription className="text-lg">
            {attempt.passed 
              ? "You've successfully passed the qualifying exam!"
              : "Don't worry, review the curriculum and try again."}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Score Card */}
      <Card>
        <CardHeader>
          <CardTitle>Your Score</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className={`text-6xl md:text-7xl font-bold mb-2 ${percentageColor}`} data-testid="text-percentage">
              {attempt.percentage}%
            </div>
            <p className="text-lg text-muted-foreground">
              {attempt.score} out of {attempt.totalQuestions} questions correct
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Score Breakdown</span>
              <Badge variant={attempt.passed ? "default" : "secondary"} data-testid="badge-result">
                {attempt.passed ? "Passed" : "Not Passed"}
              </Badge>
            </div>
            <Progress 
              value={attempt.percentage} 
              className={`h-3 ${attempt.passed ? "[&>div]:bg-chart-2" : "[&>div]:bg-destructive"}`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Performance Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">Correct Answers</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" data-testid="text-correct">{attempt.score}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-destructive" />
              <CardTitle className="text-base">Incorrect Answers</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" data-testid="text-incorrect">{attempt.totalQuestions - attempt.score}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-chart-3" />
              <CardTitle className="text-base">Completed</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold" data-testid="text-date">
              {new Date(attempt.completedAt!).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Report */}
      <Card className="border-2 border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Want to see your detailed performance?
          </CardTitle>
          <CardDescription>
            View question-by-question analysis, subject-wise breakdown, and personalized study suggestions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            className="w-full" 
            onClick={() => setLocation(`/attempt-details/${params?.id}`)}
            data-testid="button-view-details"
          >
            View Detailed Report
          </Button>
        </CardContent>
      </Card>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {attempt.passed ? (
            <div className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                Excellent work! You've met the 95% threshold and can now advance to the next level. Continue your learning journey to master more advanced concepts.
              </p>
              <Button className="w-full" onClick={() => setLocation("/")} data-testid="button-continue">
                Continue to Next Level
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                You need to score 95% or higher to advance. Review the curriculum materials to strengthen your understanding, then try the exam again with a different question set.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <Button variant="outline" className="w-full" onClick={() => setLocation("/curriculum")} data-testid="button-study">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Study Curriculum
                </Button>
                <Button className="w-full" onClick={() => setLocation("/exam")} data-testid="button-retry">
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Back to Dashboard */}
      <div className="flex justify-center pt-4">
        <Button variant="ghost" onClick={() => setLocation("/")} data-testid="button-dashboard">
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}

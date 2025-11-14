import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Trophy, Clock, Target, ChevronRight, Sparkles, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { StudentProfile, ExamAttempt } from "@shared/schema";

const LEVELS = [
  { key: "foundation", label: "Foundation", color: "chart-4", description: "Clear fundamental concepts" },
  { key: "basic", label: "Basic", color: "chart-1", description: "Entrance-level preparation" },
  { key: "main", label: "Main", color: "chart-3", description: "Advanced concepts" },
  { key: "advanced", label: "Advanced", color: "chart-2", description: "Mastery level" },
];

const STREAM_LABELS = {
  engineering: "Engineering",
  medical: "Medical",
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: profile, isLoading: profileLoading } = useQuery<StudentProfile>({
    queryKey: ["/api/student-profile"],
    retry: false,
  });

  const { data: attempts = [], isLoading: attemptsLoading } = useQuery<(ExamAttempt & { examSet: any })[]>({
    queryKey: ["/api/exam-attempts"],
    retry: false,
  });

  const generateAITest = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai-exam/generate", { numQuestions: 10 });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "AI Test Generated!",
        description: "Your personalized practice test is ready",
      });
      setLocation(`/ai-exam/${data.id}`);
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Unable to generate AI test. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!profileLoading && !profile) {
      toast({
        title: "Setup Required",
        description: "Please complete your profile setup",
      });
      setLocation("/profile-setup");
    }
  }, [profile, profileLoading, setLocation, toast]);

  if (profileLoading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const currentLevelIndex = LEVELS.findIndex(l => l.key === profile.currentLevel);
  const progressPercentage = ((currentLevelIndex + 1) / LEVELS.length) * 100;
  
  const recentAttempts = attempts.slice(0, 3);
  const totalAttempts = attempts.length;
  const passedAttempts = attempts.filter(a => a.passed).length;

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Welcome Back!</h1>
        <p className="text-muted-foreground text-lg">Continue your {STREAM_LABELS[profile.stream as keyof typeof STREAM_LABELS]} journey</p>
      </div>

      {/* Current Level Card */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-2xl mb-2">Current Level: {LEVELS[currentLevelIndex].label}</CardTitle>
              <CardDescription className="text-base">{LEVELS[currentLevelIndex].description}</CardDescription>
            </div>
            <Badge variant="secondary" className="text-sm px-4 py-2" data-testid="badge-stream">
              {STREAM_LABELS[profile.stream as keyof typeof STREAM_LABELS]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-medium" data-testid="text-progress">{progressPercentage.toFixed(0)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>
          
          {/* Level Stepper */}
          <div className="flex items-center gap-2 pt-4 overflow-x-auto pb-2">
            {LEVELS.map((level, idx) => (
              <div key={level.key} className="flex items-center gap-2 shrink-0">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                      idx <= currentLevelIndex
                        ? `bg-${level.color} text-${level.color}-foreground`
                        : "bg-muted text-muted-foreground"
                    }`}
                    data-testid={`level-indicator-${level.key}`}
                  >
                    {idx + 1}
                  </div>
                  <span className={`text-xs ${idx <= currentLevelIndex ? "text-foreground" : "text-muted-foreground"}`}>
                    {level.label}
                  </span>
                </div>
                {idx < LEVELS.length - 1 && (
                  <ChevronRight className={`w-4 h-4 ${idx < currentLevelIndex ? "text-primary" : "text-muted-foreground"}`} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover-elevate">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <CardTitle>Qualifying Exam</CardTitle>
            </div>
            <CardDescription>
              Score 95% to advance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={() => setLocation("/exam")} data-testid="button-take-exam">
              Start Exam
            </Button>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
                <Target className="w-5 h-5 text-chart-2" />
              </div>
              <CardTitle>Practice Exam</CardTitle>
            </div>
            <CardDescription>
              Unlimited practice attempts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => setLocation("/exam?practice=true")} data-testid="button-practice-exam">
              Practice Now
            </Button>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-chart-1/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-chart-1" />
              </div>
              <CardTitle>AI Practice Test</CardTitle>
            </div>
            <CardDescription>
              Personalized questions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => generateAITest.mutate()}
              disabled={generateAITest.isPending}
              data-testid="button-ai-test"
            >
              {generateAITest.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Test
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-chart-3" />
              </div>
              <CardTitle>Study Materials</CardTitle>
            </div>
            <CardDescription>
              Access learning resources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" onClick={() => setLocation("/curriculum")} data-testid="button-view-curriculum">
              View Curriculum
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-chart-2" />
              <CardTitle className="text-base">Passed Exams</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" data-testid="text-passed-exams">{passedAttempts}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">Total Attempts</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" data-testid="text-total-attempts">{totalAttempts}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-chart-3" />
              <CardTitle className="text-base">Current Level</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-current-level">{LEVELS[currentLevelIndex].label}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Attempts */}
      {recentAttempts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Exam Attempts</CardTitle>
            <CardDescription>Your latest exam performances</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAttempts.map((attempt) => {
                // Determine exam type
                const isAITest = !attempt.examSet;
                const isPractice = attempt.examSet?.isPractice;
                const examType = isAITest ? "AI Practice Test" : (isPractice ? "Practice Exam" : "Qualifying Exam");
                const examTypeVariant = isAITest ? "outline" : (isPractice ? "secondary" : "default");
                
                return (
                  <div
                    key={attempt.id}
                    className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-muted/50"
                    data-testid={`attempt-${attempt.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">Score: {attempt.score}/{attempt.totalQuestions}</p>
                        <Badge variant={examTypeVariant} className="text-xs" data-testid={`badge-type-${attempt.id}`}>
                          {examType}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(attempt.completedAt!).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={attempt.passed ? "default" : "secondary"} data-testid={`badge-result-${attempt.id}`}>
                        {attempt.percentage}%
                      </Badge>
                      <Badge variant={attempt.passed ? "default" : "destructive"}>
                        {attempt.passed ? "Passed" : "Failed"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation(`/attempt-details/${attempt.id}`)}
                        data-testid={`button-view-details-${attempt.id}`}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Details
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

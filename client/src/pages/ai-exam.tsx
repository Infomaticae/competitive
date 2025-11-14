import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Clock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AIExamQuestion {
  questionText: string;
  options: string[];
}

interface AIExam {
  id: string;
  title: string;
  level: string;
  stream: string;
  totalQuestions: number;
  questions: AIExamQuestion[];
}

export default function AIExam() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/ai-exam/:id");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeElapsed, setTimeElapsed] = useState(0);

  const examId = params?.id;

  const { data: aiExam, isLoading } = useQuery<AIExam>({
    queryKey: ["/api/ai-exam", examId],
    queryFn: async () => {
      const response = await fetch(`/api/ai-exam/${examId}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch AI exam");
      return await response.json();
    },
    enabled: !!examId,
    retry: false,
  });

  const submitExamMutation = useMutation({
    mutationFn: async (data: { examId: string; answers: Record<string, number> }) => {
      const response = await apiRequest("POST", "/api/ai-exam/submit", data);
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/exam-attempts"] });
      setLocation(`/ai-exam-result/${data.attemptId}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit exam. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading AI exam...</p>
        </div>
      </div>
    );
  }

  if (!aiExam) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">AI Exam Not Found</h2>
        <p className="text-muted-foreground mb-6">The requested exam could not be found.</p>
        <Button onClick={() => setLocation("/dashboard")} data-testid="button-back-to-dashboard">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const currentQuestion = aiExam.questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestionIndex.toString()];
  const answeredCount = Object.keys(answers).length;
  const progressPercentage = (answeredCount / aiExam.totalQuestions) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (value: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestionIndex.toString()]: parseInt(value),
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < aiExam.totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    if (answeredCount < aiExam.totalQuestions) {
      toast({
        title: "Incomplete Exam",
        description: `Please answer all ${aiExam.totalQuestions} questions before submitting.`,
        variant: "destructive",
      });
      return;
    }

    submitExamMutation.mutate({
      examId: aiExam.id,
      answers,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-chart-1" />
            <h1 className="text-2xl md:text-3xl font-bold">{aiExam.title}</h1>
          </div>
          <p className="text-muted-foreground">AI-Generated Practice Test</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" data-testid="badge-level">
            {aiExam.level}
          </Badge>
          <Badge variant="secondary" data-testid="badge-stream">
            {aiExam.stream}
          </Badge>
        </div>
      </div>

      {/* Progress and Stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <span className="text-lg font-medium" data-testid="text-time-elapsed">{formatTime(timeElapsed)}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} of {aiExam.totalQuestions}
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">Answered: </span>
              <span className="font-medium" data-testid="text-answered-count">{answeredCount}/{aiExam.totalQuestions}</span>
            </div>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </CardContent>
      </Card>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl" data-testid="text-question">
            {currentQuestion.questionText}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            key={currentQuestionIndex}
            value={currentAnswer?.toString()}
            onValueChange={handleAnswerChange}
            data-testid="radio-group-answers"
          >
            {currentQuestion.options.map((option, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 p-4 rounded-lg border hover-elevate active-elevate-2"
                data-testid={`option-${index}`}
              >
                <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          data-testid="button-previous"
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        <div className="flex gap-2">
          {currentQuestionIndex === aiExam.totalQuestions - 1 ? (
            <Button
              onClick={handleSubmit}
              disabled={submitExamMutation.isPending}
              data-testid="button-submit"
            >
              {submitExamMutation.isPending ? "Submitting..." : "Submit Exam"}
            </Button>
          ) : (
            <Button onClick={handleNext} data-testid="button-next">
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Question Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Question Navigator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {aiExam.questions.map((_, index) => (
              <Button
                key={index}
                variant={currentQuestionIndex === index ? "default" : answers[index.toString()] !== undefined ? "secondary" : "outline"}
                size="sm"
                onClick={() => setCurrentQuestionIndex(index)}
                className="w-full"
                data-testid={`nav-question-${index + 1}`}
              >
                {index + 1}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

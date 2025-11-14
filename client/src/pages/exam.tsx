import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Clock, AlertTriangle } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { ExamSet, ExamQuestion } from "@shared/schema";

export default function Exam() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showInstructions, setShowInstructions] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  
  // Get user data for displaying name
  const { data: userData } = useQuery<{ username: string; email: string }>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });
  
  // Check if this is practice mode from URL
  const isPracticeMode = window.location.search.includes("practice=true");
  
  // Timer: 180 minutes (10800 seconds) for qualifying exams, count up for practice
  const EXAM_DURATION_SECONDS = 180 * 60; // 180 minutes
  const [timeRemaining, setTimeRemaining] = useState(EXAM_DURATION_SECONDS);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [examStarted, setExamStarted] = useState(false);
  
  // Fullscreen exit detection
  const [showFullscreenAlert, setShowFullscreenAlert] = useState(false);
  const [fullscreenExitCount, setFullscreenExitCount] = useState(0);
  const fullscreenWarningShownRef = useRef(false);
  
  // Ref to prevent duplicate submissions
  const isSubmittingRef = useRef(false);

  const { data: examData, isLoading, error } = useQuery<
    { examSet: ExamSet; questions: ExamQuestion[] },
    { message: string; hoursRemaining?: number; nextAvailableAt?: string }
  >({
    queryKey: isPracticeMode ? ["/api/exam/available", "practice"] : ["/api/exam/available"],
    queryFn: async () => {
      const url = isPracticeMode ? "/api/exam/available?practice=true" : "/api/exam/available";
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        const errorData = await response.json();
        throw errorData;
      }
      return await response.json();
    },
    retry: false,
  });

  const submitExamMutation = useMutation({
    mutationFn: async (data: { examSetId: string; answers: Record<string, number> }) => {
      const response = await apiRequest("POST", "/api/exam/submit", data);
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/exam-attempts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/student-profile"] });
      isSubmittingRef.current = false; // Reset guard after success
      
      // Exit fullscreen mode after submission
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
          console.error("Failed to exit fullscreen:", err);
        });
      }
      
      setLocation(`/exam-result/${data.attemptId}`);
    },
    onError: (error: Error) => {
      isSubmittingRef.current = false; // Reset guard to allow retry
      
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to submit exam. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Submit handler with duplicate prevention (before early returns)
  const handleSubmit = useCallback(() => {
    // Prevent duplicate submissions
    if (isSubmittingRef.current || submitExamMutation.isPending || !examData) {
      return;
    }
    
    isSubmittingRef.current = true;
    
    // Allow submission with unattempted questions for proper NEET/JEE scoring
    // Unattempted questions will be scored as 0 marks
    submitExamMutation.mutate({
      examSetId: examData.examSet.id,
      answers,
    });
  }, [examData, answers, submitExamMutation]);

  // Timer effect: countdown for qualifying exams, count up for practice (only when exam started)
  useEffect(() => {
    if (!examStarted) return; // Don't start timer until exam starts
    
    const timer = setInterval(() => {
      if (isPracticeMode) {
        // Practice mode: count up
        setTimeElapsed(prev => prev + 1);
      } else {
        // Qualifying exam: count down
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Time's up - auto submit
            clearInterval(timer);
            toast({
              title: "Time's Up!",
              description: "Your exam has been automatically submitted.",
            });
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
    
    return () => {
      clearInterval(timer);
    };
  }, [examStarted, isPracticeMode, handleSubmit, toast]);

  // Fullscreen exit detection - force submit on exit
  useEffect(() => {
    if (!examStarted) return;
    
    const handleFullscreenChange = () => {
      // Check if we've exited fullscreen
      if (!document.fullscreenElement && !fullscreenWarningShownRef.current) {
        fullscreenWarningShownRef.current = true;
        setShowFullscreenAlert(true);
        setFullscreenExitCount(prev => prev + 1);
      }
    };
    
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [examStarted]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (!examData) {
    // Check if this is a cooldown error (must check type, not truthiness, as hoursRemaining can be 0)
    const isCooldownError = typeof error?.hoursRemaining === 'number';
    const errorMessage = error?.message || "No exam available";
    
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              {isCooldownError && <AlertTriangle className="w-6 h-6 text-yellow-500" />}
              {isCooldownError ? "Exam Cooldown Active" : "No Exam Available"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isCooldownError ? (
              <>
                <div className="space-y-2">
                  <p className="text-lg font-medium text-yellow-600 dark:text-yellow-500">
                    You must wait 24 hours between qualifying exam attempts
                  </p>
                  <div className="bg-muted p-4 rounded-lg space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Time remaining: <span className="font-semibold text-foreground">{error.hoursRemaining} {error.hoursRemaining === 1 ? 'hour' : 'hours'}</span>
                    </p>
                    {error.nextAvailableAt && (
                      <p className="text-sm text-muted-foreground">
                        Next available: <span className="font-semibold text-foreground">
                          {new Date(error.nextAvailableAt).toLocaleString('en-US', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </span>
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    This cooldown period ensures fair testing and prevents exam fatigue. 
                    Use this time to review your previous attempt and prepare better!
                  </p>
                </div>
                <div className="flex gap-2 justify-center">
                  <Button onClick={() => setLocation("/")} data-testid="button-back-dashboard">
                    Back to Dashboard
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setLocation("/exam?practice=true")} 
                    data-testid="button-practice-mode"
                  >
                    Try Practice Mode
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-muted-foreground">
                  {errorMessage === "No practice sets available" 
                    ? "No practice sets are available for your current level. Please contact your administrator."
                    : "You have attempted all available exam sets for your current level. Please contact your administrator for more exam sets."}
                </p>
                <Button onClick={() => setLocation("/")} data-testid="button-back-dashboard">
                  Back to Dashboard
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { examSet, questions } = examData;
  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;
  
  // Group questions by subject for instruction page
  const questionsBySubject = questions.reduce((acc, q) => {
    if (!acc[q.subject]) {
      acc[q.subject] = { total: 0, mcq: 0, numerical: 0 };
    }
    acc[q.subject].total++;
    if (q.questionType === "numerical") {
      acc[q.subject].numerical++;
    } else {
      acc[q.subject].mcq++;
    }
    return acc;
  }, {} as Record<string, { total: number; mcq: number; numerical: number }>);
  
  // Get exam pattern details
  const isNEET = examSet.examPattern === "NEET";
  const isJEE = examSet.examPattern === "JEE";
  
  // Calculate total marks
  const totalMarks = questions.reduce((sum, q) => {
    return sum + 4; // Each question is worth 4 marks
  }, 0);
  
  const handleStartExam = async () => {
    setShowInstructions(false);
    setExamStarted(true);
    
    // Request fullscreen mode
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.error("Failed to enter fullscreen:", error);
      // Continue with exam even if fullscreen fails
      toast({
        title: "Fullscreen unavailable",
        description: "Please try to avoid switching windows during the exam.",
        variant: "default",
      });
    }
  };
  
  const handleSubmitAndExit = () => {
    setShowFullscreenAlert(false);
    handleSubmit();
  };
  
  // Show instruction page before exam starts
  if (showInstructions) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl" data-testid="text-instruction-title">Exam Instructions</CardTitle>
            <p className="text-muted-foreground mt-2">{examSet.title}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Exam Pattern Info */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Exam Pattern</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border bg-card">
                  <p className="text-sm text-muted-foreground">Pattern</p>
                  <p className="text-xl font-bold" data-testid="text-exam-pattern">{examSet.examPattern}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <p className="text-sm text-muted-foreground">Total Questions</p>
                  <p className="text-xl font-bold" data-testid="text-total-questions">{questions.length}</p>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <p className="text-sm text-muted-foreground">Total Marks</p>
                  <p className="text-xl font-bold" data-testid="text-total-marks">{totalMarks}</p>
                </div>
              </div>
            </div>
            
            {/* Subject-wise Breakdown */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Subject-wise Question Distribution</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(questionsBySubject).map(([subject, counts]) => (
                  <div key={subject} className="p-4 rounded-lg border bg-card">
                    <Badge variant="outline" className="mb-2">{subject}</Badge>
                    <div className="space-y-1 mt-2">
                      <p className="text-sm">Total: <span className="font-semibold">{counts.total}</span></p>
                      {counts.mcq > 0 && <p className="text-sm">MCQ: <span className="font-semibold">{counts.mcq}</span></p>}
                      {counts.numerical > 0 && <p className="text-sm">Numerical: <span className="font-semibold">{counts.numerical}</span></p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Marking Scheme */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Marking Scheme</h3>
              <div className="p-4 rounded-lg border bg-card space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Correct Answer (All questions)</span>
                  <Badge variant="default" className="bg-green-600">+4 marks</Badge>
                </div>
                {isNEET && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Wrong Answer (All questions)</span>
                      <Badge variant="destructive">-1 mark</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Unattempted Question</span>
                      <Badge variant="secondary">0 marks</Badge>
                    </div>
                  </>
                )}
                {isJEE && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Wrong Answer (MCQ only)</span>
                      <Badge variant="destructive">-1 mark</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Wrong Answer (Numerical)</span>
                      <Badge variant="secondary">0 marks (No negative marking)</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Unattempted Question</span>
                      <Badge variant="secondary">0 marks</Badge>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Time Limit */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Time Limit</h3>
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-semibold" data-testid="text-time-limit">
                      {isPracticeMode ? "No Time Limit (Practice Mode)" : "180 Minutes"}
                    </p>
                    {!isPracticeMode && (
                      <p className="text-sm text-muted-foreground">
                        Exam will auto-submit when time is up
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* General Instructions */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">General Instructions</h3>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
                <li>Read each question carefully before selecting your answer</li>
                <li>You can navigate between questions using Previous/Next buttons</li>
                <li>You can change your answers before submitting the exam</li>
                <li>For numerical questions, enter only the numerical value</li>
                {!isPracticeMode && (
                  <>
                    <li className="font-medium text-foreground">The exam will auto-submit when time runs out</li>
                    <li>Make sure you have a stable internet connection</li>
                  </>
                )}
                <li>Click "Submit Exam" when you're done to see your results</li>
                {isPracticeMode && (
                  <li className="font-medium text-primary">This is a practice exam - results won't affect your level</li>
                )}
              </ul>
            </div>
            
            {/* Start Button */}
            <div className="flex justify-center pt-4">
              <Button 
                size="lg" 
                onClick={handleStartExam}
                data-testid="button-start-exam"
                className="min-w-48"
              >
                Start Exam
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAnswerChange = (value: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: parseInt(value),
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Get timer color based on time remaining
  const getTimerColor = () => {
    if (isPracticeMode) return "text-muted-foreground";
    if (timeRemaining <= 300) return "text-destructive"; // Red when <= 5 minutes
    if (timeRemaining <= 600) return "text-orange-500"; // Orange when <= 10 minutes
    return "text-muted-foreground";
  };

  // Calculate question number within subject (starting from 1)
  const getQuestionNumberInSubject = () => {
    const questionsInSameSubject = questions.filter(
      (q, idx) => q.subject === currentQuestion.subject && idx <= currentQuestionIndex
    );
    return questionsInSameSubject.length;
  };

  // Group questions by subject for navigation
  const questionNavGroups = questions.reduce((acc, question, index) => {
    if (!acc[question.subject]) {
      acc[question.subject] = [];
    }
    acc[question.subject].push({ question, index });
    return acc;
  }, {} as Record<string, Array<{ question: ExamQuestion; index: number }>>);

  return (
    <>
    <div className="flex gap-6 h-screen overflow-hidden">
      {/* Left Sidebar - Question Navigation */}
      <div className="w-80 flex-shrink-0 overflow-y-auto border-r bg-card/50 p-4 space-y-4">
        <div className="sticky top-0 bg-card/95 backdrop-blur-sm pb-3 border-b mb-3">
          <h3 className="font-semibold text-lg">Question Navigation</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {answeredCount}/{questions.length} Answered
          </p>
        </div>
        
        {Object.entries(questionNavGroups).map(([subject, items]) => (
          <div key={subject} className="space-y-2">
            <Badge variant="outline" className="w-full justify-start">{subject}</Badge>
            <div className="grid grid-cols-5 gap-2">
              {items.map(({ question, index }) => {
                const isAnswered = answers[question.id] !== undefined;
                const isCurrent = index === currentQuestionIndex;
                
                return (
                  <button
                    key={question.id}
                    onClick={() => setCurrentQuestionIndex(index)}
                    data-testid={`nav-question-${index + 1}`}
                    className={`
                      aspect-square rounded-md text-sm font-medium transition-all
                      ${isCurrent 
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2' 
                        : isAnswered
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }
                    `}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        
        <div className="pt-4 border-t space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-6 h-6 rounded bg-primary"></div>
            <span className="text-muted-foreground">Current</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-6 h-6 rounded bg-green-600"></div>
            <span className="text-muted-foreground">Answered</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-6 h-6 rounded bg-muted"></div>
            <span className="text-muted-foreground">Not Answered</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-4">
      {/* Exam Header with Student Name and Timer */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <CardTitle className="text-2xl mb-1" data-testid="text-exam-title">{examSet.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Student: <span className="font-medium" data-testid="text-student-name">{userData?.username || "Student"}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <Clock className={`w-5 h-5 ${getTimerColor()}`} />
                <div className="flex flex-col items-end">
                  <span className={`font-mono text-lg font-semibold ${getTimerColor()}`} data-testid="text-timer">
                    {isPracticeMode ? formatTime(timeElapsed) : formatTime(timeRemaining)}
                  </span>
                  {!isPracticeMode && (
                    <span className="text-xs text-muted-foreground">
                      {timeRemaining <= 600 ? "Time running out!" : "Time remaining"}
                    </span>
                  )}
                </div>
              </div>
              <Button
                onClick={handleSubmit}
                disabled={submitExamMutation.isPending}
                className="min-w-32"
                data-testid="button-submit-global"
              >
                {submitExamMutation.isPending ? "Submitting..." : "Submit Exam"}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {currentQuestion.subject} - Question {getQuestionNumberInSubject()}
          </span>
          <span className="font-medium" data-testid="text-answered">
            Answered: {answeredCount}/{questions.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" data-testid={`badge-subject-${currentQuestion.subject}`}>
                {currentQuestion.subject}
              </Badge>
              {currentQuestion.subSubject && (
                <Badge variant="secondary" data-testid={`badge-subsubject-${currentQuestion.subSubject}`}>
                  {currentQuestion.subSubject}
                </Badge>
              )}
              <Badge variant={currentQuestion.questionType === "numerical" ? "default" : "secondary"} data-testid={`badge-type-${currentQuestion.questionType}`}>
                {currentQuestion.questionType === "numerical" ? "Numerical" : "MCQ"}
              </Badge>
            </div>
          </div>
          <CardTitle className="text-lg leading-relaxed" data-testid="text-question">
            {currentQuestion.questionText}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentQuestion.questionType === "numerical" ? (
            <div className="space-y-3">
              <Label htmlFor="numerical-answer">Enter your numerical answer:</Label>
              <Input
                id="numerical-answer"
                type="number"
                placeholder="Enter your answer"
                value={answers[currentQuestion.id] !== undefined ? answers[currentQuestion.id] : ""}
                onChange={(e) => {
                  if (e.target.value === "") {
                    // Remove answer when field is cleared (allow unattempted)
                    setAnswers(prev => {
                      const newAnswers = { ...prev };
                      delete newAnswers[currentQuestion.id];
                      return newAnswers;
                    });
                  } else {
                    const value = parseInt(e.target.value);
                    setAnswers(prev => ({
                      ...prev,
                      [currentQuestion.id]: value,
                    }));
                  }
                }}
                data-testid="input-numerical-answer"
                className="max-w-md"
              />
              <p className="text-sm text-muted-foreground">No negative marking for numerical questions</p>
            </div>
          ) : (
            <RadioGroup
              key={currentQuestion.id}
              value={answers[currentQuestion.id] !== undefined ? answers[currentQuestion.id].toString() : undefined}
              onValueChange={handleAnswerChange}
              className="space-y-3"
            >
              {currentQuestion.options.map((option: string, idx: number) => (
                <div
                  key={idx}
                  className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-colors hover-elevate ${
                    answers[currentQuestion.id] === idx
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  }`}
                >
                  <RadioGroupItem value={idx.toString()} id={`option-${idx}`} data-testid={`radio-option-${idx}`} />
                  <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer text-base leading-relaxed">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
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

        <Button 
          onClick={handleNext} 
          disabled={currentQuestionIndex === questions.length - 1}
          data-testid="button-next"
        >
          Next
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
      </div>
    </div>
    
    <AlertDialog open={showFullscreenAlert} onOpenChange={() => {}}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Fullscreen Mode Exited
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>You have exited fullscreen mode during the exam.</p>
            <p className="font-semibold text-foreground">
              Exiting fullscreen will automatically submit your exam.
            </p>
            {!isPracticeMode && (
              <p className="text-sm text-muted-foreground">
                This action cannot be undone. Your current answers will be submitted.
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleSubmitAndExit} data-testid="button-submit-exit">
            Submit & Exit
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

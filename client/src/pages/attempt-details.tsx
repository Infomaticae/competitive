import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { 
  CheckCircle2, XCircle, AlertTriangle, TrendingUp, TrendingDown, 
  BookOpen, ArrowLeft, Target, BarChart3, Lightbulb, Minus, MessageCircle, Send, ChevronDown
} from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import katex from "katex";

// KaTeX Text Renderer Component
function KaTeXText({ text }: { text: string }) {
  const renderTextWithMath = () => {
    const parts: JSX.Element[] = [];
    let lastIndex = 0;
    let key = 0;

    // Regex to match $$ ... $$ (block) and $ ... $ (inline)
    // First match block math, then inline math
    const blockMathRegex = /\$\$([\s\S]*?)\$\$/g;
    const inlineMathRegex = /\$(.*?)\$/g;
    
    // Replace block math first with placeholder
    const textWithBlockPlaceholders = text.replace(blockMathRegex, (match, latex, offset) => {
      return `\u0000BLOCK${offset}\u0000`;
    });

    // Store block math equations
    const blockMathMap = new Map<string, string>();
    let blockMatch;
    blockMathRegex.lastIndex = 0;
    while ((blockMatch = blockMathRegex.exec(text)) !== null) {
      blockMathMap.set(`\u0000BLOCK${blockMatch.index}\u0000`, blockMatch[1]);
    }

    // Process the text with placeholders
    let currentText = textWithBlockPlaceholders;
    let match;
    
    // First, split by block math placeholders
    const blockParts = currentText.split(/(\u0000BLOCK\d+\u0000)/g);
    
    blockParts.forEach((part) => {
      if (part.startsWith('\u0000BLOCK')) {
        // This is a block math placeholder
        const latex = blockMathMap.get(part);
        if (latex) {
          try {
            const html = katex.renderToString(latex, {
              displayMode: true,
              throwOnError: false,
            });
            parts.push(
              <div
                key={key++}
                dangerouslySetInnerHTML={{ __html: html }}
                className="my-2"
              />
            );
          } catch (error) {
            parts.push(<span key={key++} className="text-destructive">{`$$${latex}$$`}</span>);
          }
        }
      } else {
        // Process inline math in this part
        let lastInlineIndex = 0;
        inlineMathRegex.lastIndex = 0;
        
        while ((match = inlineMathRegex.exec(part)) !== null) {
          // Add text before the match
          if (match.index > lastInlineIndex) {
            const textBefore = part.slice(lastInlineIndex, match.index);
            parts.push(<span key={key++}>{textBefore}</span>);
          }

          // Render inline math
          try {
            const html = katex.renderToString(match[1], {
              displayMode: false,
              throwOnError: false,
            });
            parts.push(
              <span
                key={key++}
                dangerouslySetInnerHTML={{ __html: html }}
                className="inline-block"
              />
            );
          } catch (error) {
            parts.push(<span key={key++} className="text-destructive">{match[0]}</span>);
          }

          lastInlineIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastInlineIndex < part.length) {
          parts.push(<span key={key++}>{part.slice(lastInlineIndex)}</span>);
        }
      }
    });

    return parts.length > 0 ? parts : <span>{text}</span>;
  };

  return <div className="whitespace-pre-wrap">{renderTextWithMath()}</div>;
}

interface QuestionDetail {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: number;
  studentAnswer: number | null;
  isCorrect: boolean;
  isAttempted: boolean;
  explanation?: string;
  subject: string;
  subSubject?: string;
  questionType: string;
}

interface SubjectPerformance {
  correct: number;
  total: number;
  percentage: number;
}

interface WeakArea {
  subject: string;
  percentage: number;
  correct: number;
  total: number;
}

interface Suggestion {
  subject: string;
  priority: "High" | "Medium" | "Low";
  message: string;
}

interface AttemptDetails {
  attempt: any;
  examSet: any;
  questionDetails: QuestionDetail[];
  subjectPerformance: Record<string, SubjectPerformance>;
  weakAreas: WeakArea[];
  suggestions: Suggestion[];
  summary: {
    totalQuestions: number;
    attempted: number;
    correct: number;
    incorrect: number;
    unattempted: number;
  };
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Question Chat Component
function QuestionChat({ question }: { question: QuestionDetail }) {
  const [isOpen, setIsOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");

  // Generate contextual suggested prompts based on student's answer
  const getSuggestedPrompts = () => {
    const isCorrect = question.isCorrect;
    const isUnattempted = question.studentAnswer === null;

    if (isUnattempted) {
      return [
        "How should I approach this question?",
        "What concept is being tested here?",
        "Can you explain the solution step by step?",
      ];
    } else if (isCorrect) {
      return [
        "Why is this the correct answer?",
        "Explain the concept behind this question",
        "Is there a faster way to solve this?",
      ];
    } else {
      return [
        "Why was my answer wrong?",
        "What concept did I miss?",
        "Explain the correct approach",
      ];
    }
  };

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/question-chat", {
        questionText: question.questionText,
        options: question.options,
        correctAnswer: question.correctAnswer,
        studentAnswer: question.studentAnswer,
        explanation: question.explanation,
        subject: question.subject,
        chatHistory,
        userMessage: message,
      });
      const data = await response.json();
      return data.response;
    },
    onSuccess: (aiResponse, sentMessage) => {
      // Use the actual sent message (mutation variable) instead of current input state
      setChatHistory([
        ...chatHistory,
        { role: "user", content: sentMessage },
        { role: "assistant", content: aiResponse },
      ]);
      setUserInput("");
    },
  });

  const handleSend = () => {
    if (!userInput.trim() || chatMutation.isPending) return;
    chatMutation.mutate(userInput);
  };

  const handleSuggestedPrompt = (prompt: string) => {
    chatMutation.mutate(prompt);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full mt-3 flex items-center justify-between gap-2"
          data-testid={`button-chat-${question.id}`}
        >
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            <span>Chat with AI Tutor</span>
          </div>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-3">
        <div className="border-2 rounded-lg p-3 space-y-3 bg-card">
          {/* Chat History */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {chatHistory.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground text-sm space-y-3">
                <div>
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Ask me anything about this question!</p>
                  <p className="text-xs mt-1">Try one of these prompts to get started:</p>
                </div>
                
                {/* Suggested Prompts */}
                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  {getSuggestedPrompts().map((prompt, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleSuggestedPrompt(prompt)}
                      disabled={chatMutation.isPending}
                      data-testid={`button-suggested-prompt-${idx}`}
                    >
                      {prompt}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              chatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-lg ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground ml-8"
                      : "bg-muted mr-8"
                  }`}
                  data-testid={`chat-message-${idx}`}
                >
                  <div className="text-sm">
                    <KaTeXText text={msg.content} />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input Area */}
          <div className="flex gap-2">
            <Input
              placeholder="Ask about this question..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={chatMutation.isPending}
              data-testid={`input-chat-${question.id}`}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!userInput.trim() || chatMutation.isPending}
              data-testid={`button-send-${question.id}`}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function AttemptDetails() {
  const [, params] = useRoute("/attempt-details/:id");
  const [, setLocation] = useLocation();

  const { data: details, isLoading, error } = useQuery<AttemptDetails>({
    queryKey: ["/api/exam-attempt", params?.id, "details"],
    queryFn: async () => {
      const response = await fetch(`/api/exam-attempt/${params?.id}/details`, {
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch attempt details");
      }
      return await response.json();
    },
    enabled: !!params?.id,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading detailed report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <Card>
          <CardHeader>
            <CardTitle>Report Unavailable</CardTitle>
            <CardDescription className="mt-2">
              {(error as Error).message}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              This report is not available or cannot be loaded.
            </p>
            <Button onClick={() => setLocation("/")} data-testid="button-back">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <Card>
          <CardHeader>
            <CardTitle>Report Not Found</CardTitle>
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

  const { attempt, questionDetails, subjectPerformance, weakAreas, suggestions, summary } = details;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "destructive";
      case "Medium": return "default";
      case "Low": return "secondary";
      default: return "secondary";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/")}
          data-testid="button-back-dashboard"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Detailed Exam Report</h1>
          <p className="text-muted-foreground">
            Completed on {new Date(attempt.completedAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Score</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" data-testid="text-score">{attempt.percentage}%</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Correct
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-chart-2" data-testid="text-summary-correct">{summary.correct}</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <XCircle className="w-4 h-4" /> Incorrect
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive" data-testid="text-summary-incorrect">{summary.incorrect}</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <Minus className="w-4 h-4" /> Unattempted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-muted-foreground" data-testid="text-summary-unattempted">{summary.unattempted}</p>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" data-testid="text-summary-total">{summary.totalQuestions}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="performance" data-testid="tab-performance">
            <BarChart3 className="w-4 h-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="suggestions" data-testid="tab-suggestions">
            <Lightbulb className="w-4 h-4 mr-2" />
            Suggestions
          </TabsTrigger>
          <TabsTrigger value="questions" data-testid="tab-questions">
            <Target className="w-4 h-4 mr-2" />
            All Questions
          </TabsTrigger>
        </TabsList>

        {/* Performance Analysis Tab */}
        <TabsContent value="performance" className="space-y-6 mt-6">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Subject-wise Performance</CardTitle>
              <CardDescription>Your performance breakdown by subject</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(subjectPerformance).map(([subject, perf]) => (
                <div key={subject} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{subject}</span>
                      <Badge variant="outline" className="text-xs">
                        {perf.correct}/{perf.total}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {perf.percentage >= 70 ? (
                        <TrendingUp className="w-4 h-4 text-chart-2" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-destructive" />
                      )}
                      <span className={`font-bold ${perf.percentage >= 70 ? 'text-chart-2' : 'text-destructive'}`}>
                        {perf.percentage}%
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={perf.percentage} 
                    className={`h-2 ${perf.percentage >= 70 ? '[&>div]:bg-chart-2' : '[&>div]:bg-destructive'}`}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {weakAreas.length > 0 && (
            <Card className="border-2 border-destructive/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Areas Needing Improvement
                </CardTitle>
                <CardDescription>Focus on these subjects to improve your score</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {weakAreas.map((area) => (
                    <div key={area.subject} className="p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{area.subject}</span>
                        <span className="text-destructive font-bold">{area.percentage}%</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Scored {area.correct} out of {area.total} questions
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Suggestions Tab */}
        <TabsContent value="suggestions" className="space-y-4 mt-6">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Personalized Study Suggestions</CardTitle>
              <CardDescription>Recommendations based on your performance</CardDescription>
            </CardHeader>
            <CardContent>
              {suggestions.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-chart-2 mx-auto mb-3" />
                  <p className="text-lg font-medium">Excellent Performance!</p>
                  <p className="text-muted-foreground">
                    You've performed well across all subjects. Keep up the great work!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {suggestions.map((suggestion, index) => (
                    <div key={index} className="p-4 border-2 rounded-lg" data-testid={`suggestion-${index}`}>
                      <div className="flex items-start gap-3">
                        <div className="pt-1">
                          <Badge variant={getPriorityColor(suggestion.priority) as any}>
                            {suggestion.priority} Priority
                          </Badge>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium mb-1">{suggestion.subject}</p>
                          <p className="text-sm text-muted-foreground">{suggestion.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Button 
            className="w-full" 
            onClick={() => setLocation("/curriculum")}
            data-testid="button-study-curriculum"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Go to Curriculum
          </Button>
        </TabsContent>

        {/* All Questions Tab */}
        <TabsContent value="questions" className="space-y-4 mt-6">
          <Card className="border-2">
            <CardHeader>
              <CardTitle>Question-by-Question Review</CardTitle>
              <CardDescription>Review all questions and your answers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {questionDetails.map((q, index) => (
                <div 
                  key={q.id} 
                  className={`p-4 border-2 rounded-lg ${
                    q.isCorrect ? 'border-chart-2/30 bg-chart-2/5' : 
                    q.isAttempted ? 'border-destructive/30 bg-destructive/5' : 
                    'border-muted'
                  }`}
                  data-testid={`question-${index}`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">Question {index + 1}</span>
                        <Badge variant="outline" className="text-xs">{q.subject}</Badge>
                        {q.subSubject && <Badge variant="secondary" className="text-xs">{q.subSubject}</Badge>}
                        <Badge variant="outline" className="text-xs">{q.questionType}</Badge>
                      </div>
                      <p className="text-sm leading-relaxed">{q.questionText}</p>
                    </div>
                    <div>
                      {q.isCorrect ? (
                        <CheckCircle2 className="w-6 h-6 text-chart-2" />
                      ) : q.isAttempted ? (
                        <XCircle className="w-6 h-6 text-destructive" />
                      ) : (
                        <Minus className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    {q.options.map((option, optIndex) => (
                      <div
                        key={optIndex}
                        className={`p-2 rounded text-sm ${
                          optIndex === q.correctAnswer
                            ? 'bg-chart-2/20 border border-chart-2 font-medium'
                            : optIndex === q.studentAnswer && !q.isCorrect
                            ? 'bg-destructive/20 border border-destructive'
                            : 'bg-muted/30'
                        }`}
                      >
                        <span className="font-medium mr-2">{String.fromCharCode(65 + optIndex)}.</span>
                        {option}
                        {optIndex === q.correctAnswer && (
                          <span className="ml-2 text-chart-2">✓ Correct Answer</span>
                        )}
                        {optIndex === q.studentAnswer && !q.isCorrect && (
                          <span className="ml-2 text-destructive">✗ Your Answer</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {!q.isAttempted && (
                    <p className="mt-2 text-sm text-muted-foreground italic">
                      You did not attempt this question
                    </p>
                  )}

                  {q.explanation && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                      <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">Explanation</p>
                      <p className="text-sm text-blue-800 dark:text-blue-200">{q.explanation}</p>
                    </div>
                  )}

                  {/* AI Chat for this question */}
                  <QuestionChat question={q} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-center gap-4 pt-4">
        <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-dashboard">
          Back to Dashboard
        </Button>
        <Button onClick={() => setLocation("/curriculum")} data-testid="button-curriculum">
          <BookOpen className="w-4 h-4 mr-2" />
          Study Curriculum
        </Button>
      </div>
    </div>
  );
}

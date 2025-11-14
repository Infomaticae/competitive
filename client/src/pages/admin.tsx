import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, LogOut, Sparkles, Search, Filter, BookOpen, FileQuestion, GraduationCap, BarChart } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { ExamSet, ExamQuestion, CurriculumItem } from "@shared/schema";

export default function Admin() {
  const { isAdmin, username, isLoading } = useAdminAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedSetId, setSelectedSetId] = useState<string>("");
  
  // Search and filter states
  const [examSetSearch, setExamSetSearch] = useState("");
  const [examSetFilter, setExamSetFilter] = useState<string>("all");
  const [questionSearch, setQuestionSearch] = useState("");
  const [curriculumSearch, setCurriculumSearch] = useState("");
  const [curriculumFilter, setCurriculumFilter] = useState<string>("all");

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Logout failed");
      return await response.json();
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation("/admin/login");
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out",
      });
    },
  });

  const { data: examSets = [], isLoading: setsLoading } = useQuery<ExamSet[]>({
    queryKey: ["/api/admin/exam-sets"],
    enabled: isAdmin,
  });

  const { data: questions = [], isLoading: questionsLoading } = useQuery<ExamQuestion[]>({
    queryKey: ["/api/admin/exam-questions", selectedSetId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/exam-questions?examSetId=${selectedSetId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch questions");
      return await response.json();
    },
    enabled: !!selectedSetId && isAdmin,
  });

  const { data: curriculum = [], isLoading: curriculumLoading } = useQuery<CurriculumItem[]>({
    queryKey: ["/api/admin/curriculum"],
    enabled: isAdmin,
  });

  // Filter functions with compound logic
  const filteredExamSets = examSets
    .filter(set => {
      const matchesSearch = set.title.toLowerCase().includes(examSetSearch.toLowerCase()) ||
                           set.description?.toLowerCase().includes(examSetSearch.toLowerCase());
      
      // Compound filter logic: apply multiple filters together
      let matchesFilter = true;
      if (examSetFilter === "practice") {
        matchesFilter = matchesFilter && set.isPractice;
      } else if (examSetFilter === "qualifying") {
        matchesFilter = matchesFilter && !set.isPractice;
      } else if (examSetFilter === "engineering") {
        matchesFilter = matchesFilter && set.stream === "engineering";
      } else if (examSetFilter === "medical") {
        matchesFilter = matchesFilter && set.stream === "medical";
      } else if (["foundation", "basic", "main", "advanced"].includes(examSetFilter)) {
        matchesFilter = matchesFilter && set.level === examSetFilter;
      }
      
      return matchesSearch && matchesFilter;
    });

  const filteredQuestions = questions
    .filter(q => {
      const matchesSearch = q.questionText.toLowerCase().includes(questionSearch.toLowerCase());
      return matchesSearch;
    });

  const filteredCurriculum = curriculum
    .filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(curriculumSearch.toLowerCase()) ||
                           item.description?.toLowerCase().includes(curriculumSearch.toLowerCase());
      
      // Compound filter logic
      let matchesFilter = true;
      if (curriculumFilter === "engineering") {
        matchesFilter = matchesFilter && item.stream === "engineering";
      } else if (curriculumFilter === "medical") {
        matchesFilter = matchesFilter && item.stream === "medical";
      } else if (["foundation", "basic", "main", "advanced"].includes(curriculumFilter)) {
        matchesFilter = matchesFilter && item.level === curriculumFilter;
      }
      
      return matchesSearch && matchesFilter;
    });

  // Auto-select first exam set when Questions tab is opened
  useEffect(() => {
    if (activeTab === "questions" && examSets.length > 0 && !selectedSetId) {
      setSelectedSetId(examSets[0].id);
    }
  }, [activeTab, examSets, selectedSetId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <GraduationCap className="w-7 h-7 text-primary" />
                LMS Admin Panel
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Welcome, <span className="font-medium">{username}</span>
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {logoutMutation.isPending ? "Logging out..." : "Logout"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-auto p-1">
            <TabsTrigger value="overview" className="flex items-center gap-2" data-testid="tab-overview">
              <BarChart className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="exam-sets" className="flex items-center gap-2" data-testid="tab-exam-sets">
              <FileQuestion className="w-4 h-4" />
              Exam Sets
            </TabsTrigger>
            <TabsTrigger value="questions" className="flex items-center gap-2" data-testid="tab-questions">
              <Search className="w-4 h-4" />
              Questions
            </TabsTrigger>
            <TabsTrigger value="curriculum" className="flex items-center gap-2" data-testid="tab-curriculum">
              <BookOpen className="w-4 h-4" />
              Curriculum
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Exam Sets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{examSets.length}</div>
                  <div className="flex gap-4 mt-3">
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs">Practice</Badge>
                      <span className="text-sm font-medium">{examSets.filter(s => s.isPractice).length}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="default" className="text-xs">Qualifying</Badge>
                      <span className="text-sm font-medium">{examSets.filter(s => !s.isPractice).length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Questions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{examSets.reduce((sum, set) => sum + set.totalQuestions, 0)}</div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Across all exam sets
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Curriculum Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{curriculum.length}</div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Learning resources available
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-2">
                <CardHeader>
                  <CardTitle>Exam Sets by Stream</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Engineering</span>
                      <Badge>{examSets.filter(s => s.stream === "engineering").length}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Medical</span>
                      <Badge>{examSets.filter(s => s.stream === "medical").length}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2">
                <CardHeader>
                  <CardTitle>Exam Sets by Level</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {["foundation", "basic", "main", "advanced"].map(level => (
                      <div key={level} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{level}</span>
                        <Badge>{examSets.filter(s => s.level === level).length}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Exam Sets Tab */}
          <TabsContent value="exam-sets" className="space-y-4">
            <Card className="border-2">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl">Manage Exam Sets</CardTitle>
                    <CardDescription>Create and manage exam sets for different streams and levels</CardDescription>
                  </div>
                  <ExamSetDialog mode="create" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search exam sets..."
                      value={examSetSearch}
                      onChange={(e) => setExamSetSearch(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-exam-sets"
                    />
                  </div>
                  <Select value={examSetFilter} onValueChange={setExamSetFilter}>
                    <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-filter-exam-sets">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter by..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sets</SelectItem>
                      <SelectItem value="practice">Practice Only</SelectItem>
                      <SelectItem value="qualifying">Qualifying Only</SelectItem>
                      <SelectItem value="engineering">Engineering</SelectItem>
                      <SelectItem value="medical">Medical</SelectItem>
                      <SelectItem value="foundation">Foundation</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="main">Main</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Results count */}
                <div className="text-sm text-muted-foreground">
                  Showing {filteredExamSets.length} of {examSets.length} exam sets
                </div>

                {/* Exam Sets Grid */}
                {setsLoading ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : filteredExamSets.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <FileQuestion className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No exam sets found</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredExamSets.map((set) => (
                      <Card key={set.id} className="border-2" data-testid={`card-exam-set-${set.id}`}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base line-clamp-2">{set.title}</CardTitle>
                            <Badge variant={set.isPractice ? "secondary" : "default"} className="shrink-0">
                              {set.isPractice ? "Practice" : "Qualifying"}
                            </Badge>
                          </div>
                          <CardDescription className="text-xs">
                            {set.stream} • {set.level} • Set {set.setNumber}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-muted-foreground line-clamp-2">{set.description}</p>
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Pattern:</span>
                              <Badge variant="outline">{set.examPattern || "None"}</Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Questions:</span>
                              <span className="font-medium">{set.totalQuestions}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Passing:</span>
                              <span className="font-medium">{set.passingPercentage}%</span>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <ExamSetDialog mode="edit" examSet={set} />
                            <DeleteButton
                              endpoint={`/api/admin/exam-sets/${set.id}`}
                              invalidateKey="/api/admin/exam-sets"
                              label="Exam set"
                              testId={`button-delete-set-${set.id}`}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Questions Tab */}
          <TabsContent value="questions" className="space-y-4">
            <Card className="border-2">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl">Manage Questions</CardTitle>
                    <CardDescription>Add, edit, and organize exam questions</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <CompleteExamDialog examSets={examSets} />
                    <AIQuestionDialog examSets={examSets} />
                    <QuestionDialog mode="create" examSets={examSets} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Select Exam Set */}
                <div className="space-y-2">
                  <Label>Select Exam Set</Label>
                  <Select value={selectedSetId} onValueChange={setSelectedSetId}>
                    <SelectTrigger data-testid="select-exam-set-filter">
                      <SelectValue placeholder="Choose an exam set to view questions" />
                    </SelectTrigger>
                    <SelectContent>
                      {examSets.map((set) => (
                        <SelectItem key={set.id} value={set.id}>
                          {set.title} ({set.stream} - {set.level})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedSetId && (
                  <>
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search questions..."
                        value={questionSearch}
                        onChange={(e) => setQuestionSearch(e.target.value)}
                        className="pl-9"
                        data-testid="input-search-questions"
                      />
                    </div>

                    {/* Results count */}
                    {questions.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        Showing {filteredQuestions.length} of {questions.length} questions
                      </div>
                    )}

                    {/* Questions List */}
                    {questionsLoading ? (
                      <div className="text-center py-12">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                      </div>
                    ) : filteredQuestions.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No questions found</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredQuestions.map((question, index) => (
                          <Card key={question.id} className="border-2" data-testid={`card-question-${question.id}`}>
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-2">
                                <CardTitle className="text-base">Question {index + 1}</CardTitle>
                                <div className="flex gap-2 shrink-0">
                                  <Badge variant="outline" className="text-xs">
                                    {question.subject}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {question.questionType?.toUpperCase() || "MCQ"}
                                  </Badge>
                                </div>
                              </div>
                              {question.subSubject && (
                                <CardDescription className="text-xs">
                                  {question.subSubject}
                                </CardDescription>
                              )}
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <p className="text-sm leading-relaxed">{question.questionText}</p>
                              
                              <div className="space-y-1">
                                {question.options.map((option, i) => (
                                  <div 
                                    key={i} 
                                    className={`text-sm px-3 py-2 rounded border ${
                                      question.correctAnswer === i 
                                        ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' 
                                        : 'bg-muted/30 border-border'
                                    }`}
                                  >
                                    <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
                                    {option}
                                    {question.correctAnswer === i && (
                                      <span className="ml-2 text-green-600 dark:text-green-400">✓ Correct</span>
                                    )}
                                  </div>
                                ))}
                              </div>

                              {question.explanation && (
                                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                                  <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">Explanation</p>
                                  <p className="text-sm text-blue-800 dark:text-blue-200">{question.explanation}</p>
                                </div>
                              )}

                              <div className="flex gap-2 pt-2">
                                <QuestionDialog mode="edit" examSets={examSets} question={question} />
                                <DeleteButton
                                  endpoint={`/api/admin/exam-questions/${question.id}`}
                                  invalidateKey="/api/admin/exam-questions"
                                  label="Question"
                                  testId={`button-delete-question-${question.id}`}
                                />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Curriculum Tab */}
          <TabsContent value="curriculum" className="space-y-4">
            <Card className="border-2">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl">Manage Curriculum</CardTitle>
                    <CardDescription>Add and organize learning resources</CardDescription>
                  </div>
                  <CurriculumDialog mode="create" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search curriculum..."
                      value={curriculumSearch}
                      onChange={(e) => setCurriculumSearch(e.target.value)}
                      className="pl-9"
                      data-testid="input-search-curriculum"
                    />
                  </div>
                  <Select value={curriculumFilter} onValueChange={setCurriculumFilter}>
                    <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-filter-curriculum">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Filter by..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      <SelectItem value="engineering">Engineering</SelectItem>
                      <SelectItem value="medical">Medical</SelectItem>
                      <SelectItem value="foundation">Foundation</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="main">Main</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Results count */}
                <div className="text-sm text-muted-foreground">
                  Showing {filteredCurriculum.length} of {curriculum.length} items
                </div>

                {/* Curriculum List */}
                {curriculumLoading ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : filteredCurriculum.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No curriculum items found</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredCurriculum.map((item) => (
                      <Card key={item.id} className="border-2" data-testid={`card-curriculum-${item.id}`}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base line-clamp-2">{item.title}</CardTitle>
                          <CardDescription className="text-xs">
                            {item.stream} • {item.level}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-muted-foreground line-clamp-3">{item.description}</p>

                          <div className="flex gap-2 pt-2">
                            <CurriculumDialog mode="edit" item={item} />
                            <DeleteButton
                              endpoint={`/api/admin/curriculum/${item.id}`}
                              invalidateKey="/api/admin/curriculum"
                              label="Curriculum item"
                              testId={`button-delete-curriculum-${item.id}`}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

interface ExamSetDialogProps {
  mode: "create" | "edit";
  examSet?: ExamSet;
}

function ExamSetDialog({ mode, examSet }: ExamSetDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    level: examSet?.level || "",
    stream: examSet?.stream || "",
    setNumber: examSet?.setNumber || 1,
    title: examSet?.title || "",
    description: examSet?.description || "",
    totalQuestions: examSet?.totalQuestions || 10,
    passingPercentage: examSet?.passingPercentage || 95,
    isPractice: examSet?.isPractice || false,
    examPattern: examSet?.examPattern || "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const url = mode === "create" ? "/api/admin/exam-sets" : `/api/admin/exam-sets/${examSet?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const response = await apiRequest(method, url, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/exam-sets"] });
      toast({ title: `Exam set ${mode === "create" ? "created" : "updated"} successfully` });
      setOpen(false);
    },
    onError: () => {
      toast({ title: `Failed to ${mode} exam set`, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button data-testid="button-create-exam-set">
            <Plus className="w-4 h-4 mr-2" />
            Create Exam Set
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="flex-1" data-testid={`button-edit-set-${examSet?.id}`}>
            <Pencil className="w-3 h-3 mr-1" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create" : "Edit"} Exam Set</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Stream</Label>
              <Select value={formData.stream} onValueChange={(value) => setFormData({ ...formData, stream: value })}>
                <SelectTrigger data-testid="select-stream">
                  <SelectValue placeholder="Select stream" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="engineering">Engineering</SelectItem>
                  <SelectItem value="medical">Medical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Level</Label>
              <Select value={formData.level} onValueChange={(value) => setFormData({ ...formData, level: value })}>
                <SelectTrigger data-testid="select-level">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="foundation">Foundation</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="main">Main</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} data-testid="input-title" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} data-testid="input-description" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Set Number</Label>
              <Input type="number" value={formData.setNumber} onChange={(e) => setFormData({ ...formData, setNumber: parseInt(e.target.value) })} data-testid="input-set-number" />
            </div>
            <div className="space-y-2">
              <Label>Total Questions</Label>
              <Input type="number" value={formData.totalQuestions} onChange={(e) => setFormData({ ...formData, totalQuestions: parseInt(e.target.value) })} data-testid="input-total-questions" />
            </div>
            <div className="space-y-2">
              <Label>Passing %</Label>
              <Input type="number" value={formData.passingPercentage} onChange={(e) => setFormData({ ...formData, passingPercentage: parseInt(e.target.value) })} data-testid="input-passing-percentage" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="isPractice" 
              checked={formData.isPractice} 
              onCheckedChange={(checked) => setFormData({ ...formData, isPractice: checked as boolean })}
              data-testid="checkbox-is-practice"
            />
            <Label htmlFor="isPractice" className="font-normal">
              Practice Exam (unlimited attempts, doesn't affect level progression)
            </Label>
          </div>
          <div className="space-y-2">
            <Label>Exam Pattern</Label>
            <Select value={formData.examPattern} onValueChange={(value) => setFormData({ ...formData, examPattern: value })}>
              <SelectTrigger data-testid="select-exam-pattern">
                <SelectValue placeholder="Select exam pattern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEET">NEET (180 questions: Physics-45, Chemistry-45, Biology-90)</SelectItem>
                <SelectItem value="JEE">JEE (75 questions: 25 each subject with 20 MCQ + 5 Numerical)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={() => mutation.mutate(formData)} disabled={mutation.isPending} data-testid="button-submit-exam-set">
          {mutation.isPending ? "Saving..." : mode === "create" ? "Create" : "Update"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

interface QuestionDialogProps {
  mode: "create" | "edit";
  examSets: ExamSet[];
  question?: ExamQuestion;
}

function QuestionDialog({ mode, examSets, question }: QuestionDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    examSetId: question?.examSetId || "",
    questionText: question?.questionText || "",
    subject: question?.subject || "",
    subSubject: question?.subSubject || "",
    questionType: question?.questionType || "MCQ",
    options: question?.options || ["", "", "", ""],
    correctAnswer: question?.correctAnswer || 0,
    explanation: question?.explanation || "",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const url = mode === "create" ? "/api/admin/exam-questions" : `/api/admin/exam-questions/${question?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const response = await apiRequest(method, url, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/exam-questions"] });
      toast({ title: `Question ${mode === "create" ? "created" : "updated"} successfully` });
      setOpen(false);
    },
    onError: () => {
      toast({ title: `Failed to ${mode} question`, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button data-testid="button-create-question">
            <Plus className="w-4 h-4 mr-2" />
            Create Question
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="flex-1" data-testid={`button-edit-question-${question?.id}`}>
            <Pencil className="w-3 h-3 mr-1" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create" : "Edit"} Question</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Exam Set</Label>
            <Select value={formData.examSetId} onValueChange={(value) => setFormData({ ...formData, examSetId: value })}>
              <SelectTrigger data-testid="select-exam-set">
                <SelectValue placeholder="Select exam set" />
              </SelectTrigger>
              <SelectContent>
                {examSets.map((set) => (
                  <SelectItem key={set.id} value={set.id}>
                    {set.title} ({set.stream} - {set.level})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} placeholder="e.g., Physics, Chemistry" />
            </div>
            <div className="space-y-2">
              <Label>Sub-subject (Optional)</Label>
              <Input value={formData.subSubject} onChange={(e) => setFormData({ ...formData, subSubject: e.target.value })} placeholder="e.g., Mechanics, Organic" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Question Type</Label>
            <Select value={formData.questionType} onValueChange={(value) => setFormData({ ...formData, questionType: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MCQ">Multiple Choice (MCQ)</SelectItem>
                <SelectItem value="Numerical">Numerical Answer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Question</Label>
            <Textarea value={formData.questionText} onChange={(e) => setFormData({ ...formData, questionText: e.target.value })} data-testid="input-question-text" rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Options</Label>
            {formData.options.map((option, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...formData.options];
                    newOptions[index] = e.target.value;
                    setFormData({ ...formData, options: newOptions });
                  }}
                  placeholder={`Option ${index + 1}`}
                  data-testid={`input-option-${index}`}
                />
                <Checkbox
                  checked={formData.correctAnswer === index}
                  onCheckedChange={() => setFormData({ ...formData, correctAnswer: index })}
                  data-testid={`checkbox-correct-${index}`}
                />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label>Explanation (Optional)</Label>
            <Textarea
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              placeholder="Provide explanation for the correct answer"
              data-testid="input-explanation"
              rows={3}
            />
          </div>
        </div>
        <Button onClick={() => mutation.mutate(formData)} disabled={mutation.isPending} data-testid="button-submit-question">
          {mutation.isPending ? "Saving..." : mode === "create" ? "Create" : "Update"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

interface CurriculumDialogProps {
  mode: "create" | "edit";
  item?: CurriculumItem;
}

function CurriculumDialog({ mode, item }: CurriculumDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    level: item?.level || "",
    stream: item?.stream || "",
    title: item?.title || "",
    description: item?.description || "",
    content: item?.content || "",
    orderIndex: item?.orderIndex || 0,
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const url = mode === "create" ? "/api/admin/curriculum" : `/api/admin/curriculum/${item?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const response = await apiRequest(method, url, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/curriculum"] });
      toast({ title: `Curriculum ${mode === "create" ? "created" : "updated"} successfully` });
      setOpen(false);
    },
    onError: () => {
      toast({ title: `Failed to ${mode} curriculum`, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === "create" ? (
          <Button data-testid="button-create-curriculum">
            <Plus className="w-4 h-4 mr-2" />
            Create Curriculum
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="flex-1" data-testid={`button-edit-curriculum-${item?.id}`}>
            <Pencil className="w-3 h-3 mr-1" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create" : "Edit"} Curriculum Item</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Stream</Label>
              <Select value={formData.stream} onValueChange={(value) => setFormData({ ...formData, stream: value })}>
                <SelectTrigger data-testid="select-curriculum-stream">
                  <SelectValue placeholder="Select stream" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="engineering">Engineering</SelectItem>
                  <SelectItem value="medical">Medical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Level</Label>
              <Select value={formData.level} onValueChange={(value) => setFormData({ ...formData, level: value })}>
                <SelectTrigger data-testid="select-curriculum-level">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="foundation">Foundation</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="main">Main</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} data-testid="input-curriculum-title" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} data-testid="input-curriculum-description" rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Content</Label>
            <Textarea value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} data-testid="input-curriculum-content" rows={6} />
          </div>
          <div className="space-y-2">
            <Label>Order Index</Label>
            <Input type="number" value={formData.orderIndex} onChange={(e) => setFormData({ ...formData, orderIndex: parseInt(e.target.value) })} data-testid="input-curriculum-order" />
          </div>
        </div>
        <Button onClick={() => mutation.mutate(formData)} disabled={mutation.isPending} data-testid="button-submit-curriculum">
          {mutation.isPending ? "Saving..." : mode === "create" ? "Create" : "Update"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteButtonProps {
  endpoint: string;
  invalidateKey: string;
  label: string;
  testId?: string;
}

function DeleteButton({ endpoint, invalidateKey, label, testId }: DeleteButtonProps) {
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", endpoint);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [invalidateKey] });
      toast({ title: `${label} deleted successfully` });
    },
    onError: () => {
      toast({ title: `Failed to delete ${label}`, variant: "destructive" });
    },
  });

  return (
    <Button
      variant="outline"
      size="sm"
      className="flex-1"
      onClick={() => {
        if (confirm(`Are you sure you want to delete this ${label}?`)) {
          mutation.mutate();
        }
      }}
      disabled={mutation.isPending}
      data-testid={testId}
    >
      <Trash2 className="w-3 h-3" />
    </Button>
  );
}

interface CompleteExamDialogProps {
  examSets: ExamSet[];
}

function CompleteExamDialog({ examSets }: CompleteExamDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    examSetId: "",
  });

  const selectedExamSet = examSets.find(set => set.id === formData.examSetId);
  
  const getQuestionBreakdown = () => {
    if (!selectedExamSet?.examPattern) return null;
    
    if (selectedExamSet.examPattern === "NEET") {
      return (
        <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
          <p className="font-medium">NEET Pattern - 180 Questions:</p>
          <ul className="text-sm space-y-1 ml-4">
            <li>• Physics: 45 MCQ</li>
            <li>• Chemistry: 45 MCQ</li>
            <li>• Biology: 90 MCQ (45 Botany + 45 Zoology)</li>
          </ul>
        </div>
      );
    } else if (selectedExamSet.examPattern === "JEE") {
      const stream = selectedExamSet.stream === "engineering" ? "Mathematics" : "Biology";
      return (
        <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
          <p className="font-medium">JEE Pattern - 75 Questions:</p>
          <ul className="text-sm space-y-1 ml-4">
            <li>• Physics: 20 MCQ + 5 Numerical</li>
            <li>• Chemistry: 20 MCQ + 5 Numerical</li>
            <li>• {stream}: 20 MCQ + 5 Numerical</li>
          </ul>
        </div>
      );
    }
    return null;
  };

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/admin/generate-complete-exam", data);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/exam-questions"] });
      toast({ 
        title: "Complete exam generated successfully",
        description: `${data.totalQuestions} questions have been added to the exam set`
      });
      setOpen(false);
      setFormData({ examSetId: "" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to generate complete exam", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-generate-complete-exam">
          <Sparkles className="w-4 h-4 mr-2" />
          Generate Complete Exam
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Complete Exam with AI</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Select Exam Set</Label>
            <Select value={formData.examSetId} onValueChange={(value) => setFormData({ examSetId: value })}>
              <SelectTrigger data-testid="select-complete-exam-set">
                <SelectValue placeholder="Select exam set" />
              </SelectTrigger>
              <SelectContent>
                {examSets
                  .filter(set => set.examPattern === "NEET" || set.examPattern === "JEE")
                  .map((set) => (
                    <SelectItem key={set.id} value={set.id}>
                      {set.title} ({set.examPattern})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedExamSet && getQuestionBreakdown()}

          {selectedExamSet && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Note:</strong> This will generate all questions for the {selectedExamSet.examPattern} pattern in one click. 
                Generation may take a few minutes. If any error occurs, no questions will be saved and your exam set will remain unchanged.
              </p>
            </div>
          )}
        </div>
        <Button 
          onClick={() => mutation.mutate(formData)} 
          disabled={mutation.isPending || !formData.examSetId} 
          data-testid="button-submit-complete-exam"
        >
          {mutation.isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Generating Complete Exam...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Complete Exam
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

interface AIQuestionDialogProps {
  examSets: ExamSet[];
}

function AIQuestionDialog({ examSets }: AIQuestionDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    examSetId: "",
    subject: "",
    questionType: "MCQ",
    count: 5,
    difficulty: "medium",
  });

  const selectedExamSet = examSets.find(set => set.id === formData.examSetId);
  
  const subjectOptions = selectedExamSet?.examPattern === "NEET"
    ? ["Physics", "Chemistry", "Biology", "Botany", "Zoology"]
    : selectedExamSet?.examPattern === "JEE"
    ? ["Physics", "Chemistry", "Mathematics"]
    : [];

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Transform 'count' to 'numQuestions' for backend compatibility
      const requestData = {
        examSetId: data.examSetId,
        subject: data.subject,
        questionType: data.questionType,
        numQuestions: data.count, // Backend expects 'numQuestions' not 'count'
      };
      const response = await apiRequest("POST", "/api/admin/generate-questions", requestData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/exam-questions"] });
      toast({ 
        title: "Questions generated successfully",
        description: "AI-generated questions have been added to the exam set"
      });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to generate questions", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-ai-generate">
          <Sparkles className="w-4 h-4 mr-2" />
          AI Generate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Questions with AI</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Exam Set</Label>
            <Select value={formData.examSetId} onValueChange={(value) => setFormData({ ...formData, examSetId: value, subject: "" })}>
              <SelectTrigger data-testid="select-ai-exam-set">
                <SelectValue placeholder="Select exam set" />
              </SelectTrigger>
              <SelectContent>
                {examSets.map((set) => (
                  <SelectItem key={set.id} value={set.id}>
                    {set.title} ({set.examPattern || "No pattern"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {formData.examSetId && subjectOptions.length > 0 && (
            <>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={formData.subject} onValueChange={(value) => setFormData({ ...formData, subject: value })}>
                  <SelectTrigger data-testid="select-ai-subject">
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjectOptions.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedExamSet?.examPattern === "JEE" && (
                <div className="space-y-2">
                  <Label>Question Type</Label>
                  <Select value={formData.questionType} onValueChange={(value) => setFormData({ ...formData, questionType: value })}>
                    <SelectTrigger data-testid="select-ai-question-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MCQ">Multiple Choice (MCQ)</SelectItem>
                      <SelectItem value="Numerical">Numerical Answer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Number of Questions (1-20)</Label>
                <Input 
                  type="number" 
                  min="1" 
                  max="20" 
                  value={formData.count} 
                  onChange={(e) => setFormData({ ...formData, count: parseInt(e.target.value) })} 
                  data-testid="input-ai-count"
                />
              </div>

              <div className="space-y-2">
                <Label>Difficulty Level</Label>
                <Select value={formData.difficulty} onValueChange={(value) => setFormData({ ...formData, difficulty: value })}>
                  <SelectTrigger data-testid="select-ai-difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
        <Button 
          onClick={() => mutation.mutate(formData)} 
          disabled={mutation.isPending || !formData.examSetId || !formData.subject} 
          data-testid="button-submit-ai-generate"
        >
          {mutation.isPending ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Questions
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

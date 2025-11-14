// API routes
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuthRoutes, isAuthenticated, isAdmin } from "./auth";
import { insertStudentProfileSchema, insertExamAttemptSchema, insertExamSetSchema, insertExamQuestionSchema, insertCurriculumItemSchema } from "@shared/schema";
import bcrypt from "bcryptjs";

const LEVEL_ORDER = ["foundation", "basic", "main", "advanced"];

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuthRoutes(app);

  // Admin authentication routes
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const admin = await storage.getAdminByUsername(username);
      
      if (!admin) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, admin.passwordHash);
      
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Store admin session
      (req.session as any).adminId = admin.id;
      
      res.json({ message: "Login successful" });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    delete (req.session as any).adminId;
    res.json({ message: "Logout successful" });
  });

  app.get("/api/admin/check", async (req, res) => {
    try {
      const adminId = (req.session as any).adminId;
      
      if (!adminId) {
        return res.status(401).json({ isAdmin: false });
      }

      const admin = await storage.getAdminById(adminId);
      
      if (!admin) {
        return res.status(401).json({ isAdmin: false });
      }

      res.json({ isAdmin: true, username: admin.username });
    } catch (error) {
      console.error("Admin check error:", error);
      res.status(500).json({ isAdmin: false });
    }
  });

  // Student Profile routes
  app.get("/api/student-profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const profile = await storage.getStudentProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.post("/api/student-profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Check if profile already exists
      const existing = await storage.getStudentProfile(userId);
      if (existing) {
        return res.status(400).json({ message: "Profile already exists" });
      }

      const validatedData = insertStudentProfileSchema.parse({
        userId,
        stream: req.body.stream,
        currentLevel: "foundation", // All students start at foundation
      });

      const profile = await storage.createStudentProfile(validatedData);
      res.json(profile);
    } catch (error) {
      console.error("Error creating profile:", error);
      res.status(500).json({ message: "Failed to create profile" });
    }
  });

  // Exam routes
  app.get("/api/exam/available", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const isPractice = req.query.practice === "true";
      const profile = await storage.getStudentProfile(userId);

      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      if (isPractice) {
        // For practice exams, get any practice set for the user's level
        const practiceSets = await storage.getExamSets(profile.currentLevel, profile.stream);
        const practiceSet = practiceSets.find(set => set.isPractice);
        
        if (!practiceSet) {
          return res.status(404).json({ message: "No practice sets available" });
        }

        const questions = await storage.getQuestionsByExamSet(practiceSet.id);
        return res.json({
          examSet: practiceSet,
          questions: questions.map(q => ({
            id: q.id,
            questionText: q.questionText,
            options: q.options,
            subject: q.subject,
            subSubject: q.subSubject,
            questionType: q.questionType,
          })),
        });
      }

      // Regular qualifying exams - check 24-hour cooldown
      const attempts = await storage.getExamAttempts(profile.id);
      
      // Find the last qualifying exam attempt (non-practice)
      const qualifyingAttempts = [];
      for (const attempt of attempts) {
        // Skip AI-generated exams (those with null examSetId)
        if (!attempt.examSetId) continue;
        
        const examSet = await storage.getExamSet(attempt.examSetId);
        if (examSet && !examSet.isPractice) {
          qualifyingAttempts.push(attempt);
        }
      }
      
      if (qualifyingAttempts.length > 0) {
        // Sort by completedAt to get the most recent
        qualifyingAttempts.sort((a, b) => 
          new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()
        );
        
        const lastAttempt = qualifyingAttempts[0];
        const lastAttemptTime = new Date(lastAttempt.completedAt!);
        const now = new Date();
        const hoursSinceLastAttempt = (now.getTime() - lastAttemptTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceLastAttempt < 24) {
          const hoursRemaining = Math.ceil(24 - hoursSinceLastAttempt);
          return res.status(403).json({ 
            message: "You must wait 24 hours between qualifying exam attempts",
            hoursRemaining,
            nextAvailableAt: new Date(lastAttemptTime.getTime() + 24 * 60 * 60 * 1000).toISOString()
          });
        }
      }
      
      // Filter out null examSetIds (AI-generated exams)
      const attemptedSetIds = attempts.map(a => a.examSetId).filter((id): id is string => id !== null);

      const examSet = await storage.getAvailableExamSet(
        profile.currentLevel,
        profile.stream,
        attemptedSetIds
      );

      if (!examSet) {
        return res.status(404).json({ message: "No available exam sets" });
      }

      const questions = await storage.getQuestionsByExamSet(examSet.id);

      res.json({
        examSet,
        questions: questions.map(q => ({
          id: q.id,
          questionText: q.questionText,
          options: q.options,
          subject: q.subject,
          subSubject: q.subSubject,
          questionType: q.questionType,
        })),
      });
    } catch (error) {
      console.error("Error fetching exam:", error);
      res.status(500).json({ message: "Failed to fetch exam" });
    }
  });

  app.post("/api/exam/submit", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { examSetId, answers } = req.body;

      const profile = await storage.getStudentProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const examSet = await storage.getExamSet(examSetId);
      if (!examSet) {
        return res.status(404).json({ message: "Exam set not found" });
      }

      // Get questions and calculate score with proper exam pattern
      const questions = await storage.getQuestionsByExamSet(examSetId);
      const { calculateExamScore } = await import("./exam-scoring");
      const scoringResult = calculateExamScore(questions, answers, examSet.examPattern);

      const totalQuestions = questions.length;
      const percentage = Math.round((scoringResult.score / scoringResult.totalMarks) * 100);
      const passed = percentage >= examSet.passingPercentage;

      // Create exam attempt record
      const attemptData = {
        studentProfileId: profile.id,
        examSetId,
        answers,
        score: scoringResult.score,
        totalQuestions,
        percentage,
        passed,
      };

      const attempt = await storage.createExamAttempt(attemptData);

      // Only advance level for qualifying exams (not practice)
      if (passed && !examSet.isPractice) {
        const currentIndex = LEVEL_ORDER.indexOf(profile.currentLevel);
        if (currentIndex < LEVEL_ORDER.length - 1) {
          const nextLevel = LEVEL_ORDER[currentIndex + 1];
          await storage.updateStudentLevel(profile.id, nextLevel);
        }
      }

      res.json({ 
        attemptId: attempt.id, 
        passed, 
        percentage, 
        isPractice: examSet.isPractice,
        scoringDetails: scoringResult
      });
    } catch (error) {
      console.error("Error submitting exam:", error);
      res.status(500).json({ message: "Failed to submit exam" });
    }
  });

  // Exam Attempts routes
  app.get("/api/exam-attempts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const profile = await storage.getStudentProfile(userId);

      if (!profile) {
        return res.json([]);
      }

      const attempts = await storage.getExamAttempts(profile.id);
      res.json(attempts.reverse()); // Most recent first
    } catch (error) {
      console.error("Error fetching attempts:", error);
      res.status(500).json({ message: "Failed to fetch attempts" });
    }
  });

  app.get("/api/exam-attempt/:id", isAuthenticated, async (req: any, res) => {
    try {
      const attempt = await storage.getExamAttempt(req.params.id);
      
      if (!attempt) {
        return res.status(404).json({ message: "Attempt not found" });
      }

      res.json(attempt);
    } catch (error) {
      console.error("Error fetching attempt:", error);
      res.status(500).json({ message: "Failed to fetch attempt" });
    }
  });

  // Get detailed exam attempt report with questions and analysis
  app.get("/api/exam-attempt/:id/details", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const attemptId = req.params.id;

      const attempt = await storage.getExamAttempt(attemptId);
      if (!attempt) {
        return res.status(404).json({ message: "Exam attempt not found" });
      }

      // Verify ownership
      const profile = await storage.getStudentProfile(userId);
      if (!profile || attempt.studentProfileId !== profile.id) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Determine if this is a regular exam set or AI-generated exam
      const isAIExam = !attempt.examSetId && attempt.aiExamId;
      let examSet = null;
      let questionDetails: any[] = [];

      if (isAIExam) {
        // Handle AI-generated exam
        const aiExam = await storage.getAiGeneratedExam(attempt.aiExamId!);
        if (!aiExam) {
          return res.status(404).json({ message: "AI exam not found" });
        }

        // Build question details from AI exam questions (index-based answers)
        questionDetails = aiExam.questions.map((q, index) => {
          const studentAnswer = attempt.answers[index.toString()];
          const isCorrect = studentAnswer === q.correctAnswer;
          
          return {
            id: index.toString(),
            questionText: q.questionText,
            options: q.options,
            correctAnswer: q.correctAnswer,
            studentAnswer: studentAnswer ?? null,
            isCorrect,
            isAttempted: studentAnswer !== undefined && studentAnswer !== null,
            explanation: q.explanation,
            subject: q.subject,
            subSubject: q.subSubject,
            questionType: "mcq",
          };
        });
      } else {
        // Handle regular exam set
        if (!attempt.examSetId) {
          return res.status(400).json({ 
            message: "Invalid exam attempt - no exam set or AI exam reference found",
            type: "INVALID_ATTEMPT"
          });
        }

        examSet = await storage.getExamSet(attempt.examSetId);
        if (!examSet) {
          return res.status(404).json({ message: "Exam set not found" });
        }

        const questions = await storage.getQuestionsByExamSet(attempt.examSetId);
        if (!questions || questions.length === 0) {
          return res.status(400).json({ 
            message: "No questions found for this exam",
            type: "NO_QUESTIONS"
          });
        }

        // Build detailed question analysis (question ID-based answers)
        questionDetails = questions.map(q => {
          const studentAnswer = attempt.answers[q.id];
          const isCorrect = studentAnswer === q.correctAnswer;
          
          return {
            id: q.id,
            questionText: q.questionText,
            options: q.options,
            correctAnswer: q.correctAnswer,
            studentAnswer: studentAnswer ?? null,
            isCorrect,
            isAttempted: studentAnswer !== undefined && studentAnswer !== null,
            explanation: q.explanation,
            subject: q.subject,
            subSubject: q.subSubject,
            questionType: q.questionType,
          };
        });
      }

      // Calculate subject-wise performance
      const subjectPerformance: Record<string, { correct: number; total: number; percentage: number }> = {};
      
      questionDetails.forEach(q => {
        const subject = q.subject || "General";
        if (!subjectPerformance[subject]) {
          subjectPerformance[subject] = { correct: 0, total: 0, percentage: 0 };
        }
        subjectPerformance[subject].total++;
        if (q.isCorrect) {
          subjectPerformance[subject].correct++;
        }
      });

      // Calculate percentages and identify weak areas
      Object.keys(subjectPerformance).forEach(subject => {
        const perf = subjectPerformance[subject];
        perf.percentage = perf.total > 0 ? Math.round((perf.correct / perf.total) * 100) : 0;
      });

      // Identify weak areas (subjects below 70%)
      const weakAreas = Object.entries(subjectPerformance)
        .filter(([_, perf]) => perf.percentage < 70)
        .map(([subject, perf]) => ({
          subject,
          percentage: perf.percentage,
          correct: perf.correct,
          total: perf.total
        }))
        .sort((a, b) => a.percentage - b.percentage);

      // Generate study suggestions based on weak areas
      const suggestions = weakAreas.map(area => {
        if (area.percentage < 40) {
          return {
            subject: area.subject,
            priority: "High" as const,
            message: `Focus heavily on ${area.subject}. You scored only ${area.percentage}% (${area.correct}/${area.total}). Review fundamental concepts and practice more questions.`
          };
        } else if (area.percentage < 60) {
          return {
            subject: area.subject,
            priority: "Medium" as const,
            message: `Strengthen your ${area.subject} knowledge. You scored ${area.percentage}% (${area.correct}/${area.total}). Review key topics and solve practice problems.`
          };
        } else {
          return {
            subject: area.subject,
            priority: "Low" as const,
            message: `Improve ${area.subject} slightly. You scored ${area.percentage}% (${area.correct}/${area.total}). A bit more practice will help you reach mastery.`
          };
        }
      });

      // Add general suggestion if all areas are strong
      if (weakAreas.length === 0 && attempt.percentage < 100) {
        suggestions.push({
          subject: "General",
          priority: "Low" as const,
          message: "Great performance across all subjects! Review the questions you missed to achieve perfection."
        });
      }

      return res.json({
        attempt,
        examSet,
        questionDetails,
        subjectPerformance,
        weakAreas,
        suggestions,
        summary: {
          totalQuestions: questionDetails.length,
          attempted: questionDetails.filter(q => q.isAttempted).length,
          correct: questionDetails.filter(q => q.isCorrect).length,
          incorrect: questionDetails.filter(q => !q.isCorrect && q.isAttempted).length,
          unattempted: questionDetails.filter(q => !q.isAttempted).length,
        }
      });
    } catch (error) {
      console.error("Get exam attempt details error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // AI-generated exam routes
  app.post("/api/ai-exam/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const profile = await storage.getStudentProfile(userId);

      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const { generatePracticeTest } = await import("./openai-client");
      const numQuestions = req.body.numQuestions || 10;

      const questions = await generatePracticeTest(
        profile.currentLevel,
        profile.stream,
        numQuestions
      );

      const aiExam = await storage.createAiGeneratedExam({
        studentProfileId: profile.id,
        level: profile.currentLevel,
        stream: profile.stream,
        title: `AI Practice Test - ${profile.currentLevel} ${profile.stream}`,
        questions,
        totalQuestions: questions.length,
      });

      res.json(aiExam);
    } catch (error) {
      console.error("Error generating AI exam:", error);
      res.status(500).json({ message: "Failed to generate practice test" });
    }
  });

  app.get("/api/ai-exam/:id", isAuthenticated, async (req: any, res) => {
    try {
      const examId = req.params.id;
      const aiExam = await storage.getAiGeneratedExam(examId);

      if (!aiExam) {
        return res.status(404).json({ message: "AI exam not found" });
      }

      // Return exam without correct answers and explanations
      const examForStudent = {
        ...aiExam,
        questions: aiExam.questions.map(q => ({
          questionText: q.questionText,
          options: q.options,
        })),
      };

      res.json(examForStudent);
    } catch (error) {
      console.error("Error fetching AI exam:", error);
      res.status(500).json({ message: "Failed to fetch exam" });
    }
  });

  app.get("/api/ai-exam/list/all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const profile = await storage.getStudentProfile(userId);

      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const aiExams = await storage.getAiGeneratedExams(profile.id);
      res.json(aiExams);
    } catch (error) {
      console.error("Error fetching AI exams:", error);
      res.status(500).json({ message: "Failed to fetch exams" });
    }
  });

  app.post("/api/ai-exam/submit", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { examId, answers } = req.body;

      const profile = await storage.getStudentProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const aiExam = await storage.getAiGeneratedExam(examId);
      if (!aiExam) {
        return res.status(404).json({ message: "Exam not found" });
      }

      // Calculate score
      let correctCount = 0;
      const wrongQuestions: Array<{
        questionText: string;
        correctAnswer: string;
        userAnswer: string;
      }> = [];

      aiExam.questions.forEach((question, index) => {
        const userAnswer = answers[index.toString()];
        if (userAnswer === question.correctAnswer) {
          correctCount++;
        } else if (userAnswer !== undefined) {
          wrongQuestions.push({
            questionText: question.questionText,
            correctAnswer: question.options[question.correctAnswer],
            userAnswer: question.options[userAnswer] || "No answer",
          });
        }
      });

      const percentage = Math.round((correctCount / aiExam.totalQuestions) * 100);

      // Generate revision content
      const { generateRevisionContent } = await import("./openai-client");
      const revisionContent = await generateRevisionContent(
        aiExam.level,
        aiExam.stream,
        correctCount,
        aiExam.totalQuestions,
        wrongQuestions
      );

      // Create exam attempt with revision content
      const attempt = await storage.createExamAttempt({
        studentProfileId: profile.id,
        examSetId: null, // AI-generated exams don't have an examSetId
        aiExamId: examId, // Link to the AI-generated exam
        answers,
        score: correctCount,
        totalQuestions: aiExam.totalQuestions,
        percentage,
        passed: percentage >= 95,
        revisionContent,
      });

      res.json({
        attemptId: attempt.id,
        score: correctCount,
        totalQuestions: aiExam.totalQuestions,
        percentage,
        passed: percentage >= 95,
        revisionContent,
      });
    } catch (error) {
      console.error("Error submitting AI exam:", error);
      res.status(500).json({ message: "Failed to submit exam" });
    }
  });

  // Question chat endpoint - AI tutor for discussing exam questions
  app.post("/api/question-chat", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const profile = await storage.getStudentProfile(userId);

      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const { 
        questionText, 
        options, 
        correctAnswer, 
        studentAnswer, 
        explanation, 
        subject,
        chatHistory, 
        userMessage 
      } = req.body;

      if (!questionText || !options || correctAnswer === undefined || !userMessage) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const { chatAboutQuestion } = await import("./openai-client");
      const aiResponse = await chatAboutQuestion(
        questionText,
        options,
        correctAnswer,
        studentAnswer ?? null,
        explanation || "No explanation provided",
        subject || "General",
        chatHistory || [],
        userMessage,
        profile.currentLevel,
        profile.stream
      );

      res.json({ response: aiResponse });
    } catch (error) {
      console.error("Error in question chat:", error);
      res.status(500).json({ message: "Failed to get AI response" });
    }
  });

  // Curriculum routes
  app.get("/api/curriculum", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const profile = await storage.getStudentProfile(userId);

      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const items = await storage.getCurriculumItems(profile.currentLevel, profile.stream);
      res.json(items);
    } catch (error) {
      console.error("Error fetching curriculum:", error);
      res.status(500).json({ message: "Failed to fetch curriculum" });
    }
  });

  // Admin routes
  app.get("/api/admin/exam-sets", isAdmin, async (req: any, res) => {
    try {
      const sets = await storage.getAllExamSets();
      res.json(sets);
    } catch (error) {
      console.error("Error fetching exam sets:", error);
      res.status(500).json({ message: "Failed to fetch exam sets" });
    }
  });

  app.post("/api/admin/exam-sets", isAdmin, async (req: any, res) => {
    try {
      const validatedData = insertExamSetSchema.parse(req.body);
      const examSet = await storage.createExamSet(validatedData);
      res.json(examSet);
    } catch (error) {
      console.error("Error creating exam set:", error);
      res.status(500).json({ message: "Failed to create exam set" });
    }
  });

  app.patch("/api/admin/exam-sets/:id", isAdmin, async (req: any, res) => {
    try {
      const examSet = await storage.updateExamSet(req.params.id, req.body);
      res.json(examSet);
    } catch (error) {
      console.error("Error updating exam set:", error);
      res.status(500).json({ message: "Failed to update exam set" });
    }
  });

  app.delete("/api/admin/exam-sets/:id", isAdmin, async (req: any, res) => {
    try {
      await storage.deleteExamSet(req.params.id);
      res.json({ message: "Exam set deleted" });
    } catch (error) {
      console.error("Error deleting exam set:", error);
      res.status(500).json({ message: "Failed to delete exam set" });
    }
  });

  app.get("/api/admin/exam-questions", isAdmin, async (req: any, res) => {
    try {
      const examSetId = req.query.examSetId;
      if (!examSetId) {
        return res.status(400).json({ message: "examSetId is required" });
      }
      const questions = await storage.getQuestionsByExamSet(examSetId as string);
      res.json(questions);
    } catch (error) {
      console.error("Error fetching exam questions:", error);
      res.status(500).json({ message: "Failed to fetch exam questions" });
    }
  });

  app.post("/api/admin/exam-questions", isAdmin, async (req: any, res) => {
    try {
      const validatedData = insertExamQuestionSchema.parse(req.body);
      const question = await storage.createExamQuestion(validatedData);
      res.json(question);
    } catch (error) {
      console.error("Error creating exam question:", error);
      res.status(500).json({ message: "Failed to create exam question" });
    }
  });

  app.patch("/api/admin/exam-questions/:id", isAdmin, async (req: any, res) => {
    try {
      const question = await storage.updateExamQuestion(req.params.id, req.body);
      res.json(question);
    } catch (error) {
      console.error("Error updating exam question:", error);
      res.status(500).json({ message: "Failed to update exam question" });
    }
  });

  app.delete("/api/admin/exam-questions/:id", isAdmin, async (req: any, res) => {
    try {
      await storage.deleteExamQuestion(req.params.id);
      res.json({ message: "Question deleted" });
    } catch (error) {
      console.error("Error deleting exam question:", error);
      res.status(500).json({ message: "Failed to delete exam question" });
    }
  });

  // AI question generation for admin (subject-by-subject)
  app.post("/api/admin/generate-questions", isAdmin, async (req: any, res) => {
    try {
      const { examSetId, subject, questionType, numQuestions } = req.body;
      
      if (!examSetId || !subject || !questionType || !numQuestions) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const examSet = await storage.getExamSet(examSetId);
      if (!examSet) {
        return res.status(404).json({ message: "Exam set not found" });
      }
      
      const { generateExamQuestions } = await import("./openai-client");
      
      const generatedQuestions = await generateExamQuestions(
        examSet.examPattern || "NEET",
        subject,
        questionType,
        numQuestions,
        examSet.level,
        examSet.stream
      );
      
      // Get the current highest orderIndex for this exam set
      const existingQuestions = await storage.getQuestionsByExamSet(examSetId);
      let currentMaxOrder = existingQuestions.length > 0 
        ? Math.max(...existingQuestions.map(q => q.orderIndex || 0)) 
        : -1;
      
      // Save questions to database
      const savedQuestions = [];
      for (const question of generatedQuestions) {
        currentMaxOrder++;
        const savedQuestion = await storage.createExamQuestion({
          examSetId,
          questionText: question.questionText,
          options: question.options,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          subject: subject,
          questionType: questionType,
          orderIndex: currentMaxOrder,
        });
        savedQuestions.push(savedQuestion);
      }
      
      res.json({ 
        message: `${savedQuestions.length} questions generated successfully`,
        questions: savedQuestions 
      });
    } catch (error) {
      console.error("Error generating questions:", error);
      res.status(500).json({ message: "Failed to generate questions" });
    }
  });

  // AI complete exam generation for admin (one-click)
  app.post("/api/admin/generate-complete-exam", isAdmin, async (req: any, res) => {
    try {
      const { examSetId } = req.body;
      
      if (!examSetId) {
        return res.status(400).json({ message: "Missing exam set ID" });
      }
      
      const examSet = await storage.getExamSet(examSetId);
      if (!examSet) {
        return res.status(404).json({ message: "Exam set not found" });
      }

      const { generateExamQuestions } = await import("./openai-client");
      
      // Define question distribution based on exam pattern
      let questionConfig: Array<{ subject: string; questionType: string; count: number; subSubject?: string }> = [];
      let expectedTotal = 0;
      
      if (examSet.examPattern === "NEET") {
        // NEET: 180 questions - Physics 45, Chemistry 45, Biology 90 (Botany 45 + Zoology 45)
        questionConfig = [
          { subject: "Physics", questionType: "MCQ", count: 45 },
          { subject: "Chemistry", questionType: "MCQ", count: 45 },
          { subject: "Biology", questionType: "MCQ", count: 45, subSubject: "Botany" },
          { subject: "Biology", questionType: "MCQ", count: 45, subSubject: "Zoology" },
        ];
        expectedTotal = 180;
      } else if (examSet.examPattern === "JEE") {
        // JEE: 75 questions - 25 each subject (20 MCQ + 5 Numerical)
        const subjects = examSet.stream === "engineering" 
          ? ["Physics", "Chemistry", "Mathematics"]
          : ["Physics", "Chemistry", "Biology"];
        
        subjects.forEach(subject => {
          questionConfig.push(
            { subject, questionType: "MCQ", count: 20 },
            { subject, questionType: "Numerical", count: 5 }
          );
        });
        expectedTotal = 75;
      } else {
        return res.status(400).json({ message: "Exam pattern not supported for complete generation. Only NEET and JEE patterns are supported." });
      }

      console.log(`Starting complete exam generation for ${examSet.examPattern} pattern (${expectedTotal} questions expected)`);

      // STEP 1: Generate all questions first (buffer in memory)
      let allGeneratedQuestions: Array<{
        questionText: string;
        options: string[];
        correctAnswer: number;
        explanation: string;
        subject: string;
        subSubject?: string;
        questionType: string;
      }> = [];

      const generationPromises = questionConfig.map(async(config)=> {
        console.log(
          `Generating ${config.count} ${config.questionType} questions for ${config.subject}${config.subSubject ? ` (${config.subSubject})` : ''}`
        );
        const generatedQuestions = await generateExamQuestions(
          examSet.examPattern,
          config.subject,
          config.questionType,
          config.count,
          examSet.level,
          examSet.stream
        );
        if (generatedQuestions.length !== config.count) {
          throw new Error(
            `AI generation failed: Expected ${config.count} questions for ${config.subject} ${config.questionType}, but received ${generatedQuestions.length}. Aborting to prevent incomplete exam set.`
          );
        }

        // Return the enriched question set
        return generatedQuestions.map((q) => ({
          ...q,
          subject: config.subject,
          subSubject: config.subSubject,
          questionType: config.questionType,
        }));
        
      })

      const results = await Promise.all(generationPromises);
      allGeneratedQuestions = results.flat();

      // for (const config of questionConfig) {
      //   console.log(`Generating ${config.count} ${config.questionType} questions for ${config.subject}${config.subSubject ? ` (${config.subSubject})` : ''}`);
        
      //   const generatedQuestions = await generateExamQuestions(
      //     examSet.examPattern,
      //     config.subject,
      //     config.questionType,
      //     config.count,
      //     examSet.level,
      //     examSet.stream
      //   );

      //   // STEP 2: Validate that AI returned the expected count
      //   if (generatedQuestions.length !== config.count) {
      //     throw new Error(
      //       `AI generation failed: Expected ${config.count} questions for ${config.subject} ${config.questionType}, but received ${generatedQuestions.length}. Aborting to prevent incomplete exam set.`
      //     );
      //   }

      //   // Add to buffer with metadata
      //   generatedQuestions.forEach(q => {
      //     allGeneratedQuestions.push({
      //       ...q,
      //       subject: config.subject,
      //       subSubject: config.subSubject,
      //       questionType: config.questionType,
      //     });
      //   });
      // }

      // STEP 3: Final validation - ensure total count matches expected
      if (allGeneratedQuestions.length !== expectedTotal) {
        throw new Error(
          `Total question count mismatch: Expected ${expectedTotal} questions but generated ${allGeneratedQuestions.length}. Aborting save to prevent incomplete exam.`
        );
      }

      console.log(`Successfully generated all ${allGeneratedQuestions.length} questions. Now saving to database...`);

      // STEP 4: Get the current highest orderIndex for this exam set
      const existingQuestions = await storage.getQuestionsByExamSet(examSetId);
      let currentMaxOrder = existingQuestions.length > 0 
        ? Math.max(...existingQuestions.map(q => q.orderIndex || 0)) 
        : -1;

      // STEP 5: Only now save all questions to database (all-or-nothing)
      const allSavedQuestions = [];
      for (const question of allGeneratedQuestions) {
        currentMaxOrder++;
        const savedQuestion = await storage.createExamQuestion({
          examSetId,
          questionText: question.questionText,
          options: question.options,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
          subject: question.subject,
          subSubject: question.subSubject,
          questionType: question.questionType,
          orderIndex: currentMaxOrder,
        });
        allSavedQuestions.push(savedQuestion);
      }

      console.log(`Successfully saved all ${allSavedQuestions.length} questions to database`);

      res.json({ 
        message: `Complete exam generated: ${allSavedQuestions.length} questions added successfully`,
        totalQuestions: allSavedQuestions.length,
        questions: allSavedQuestions 
      });
    } catch (error) {
      console.error("Error generating complete exam:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({ 
        message: "Failed to generate complete exam. No questions were saved.",
        error: errorMessage,
        note: "The exam set was not modified due to this error."
      });
    }
  });

  app.get("/api/admin/curriculum", isAdmin, async (req: any, res) => {
    try {
      const items = await storage.getAllCurriculumItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching curriculum items:", error);
      res.status(500).json({ message: "Failed to fetch curriculum items" });
    }
  });

  app.post("/api/admin/curriculum", isAdmin, async (req: any, res) => {
    try {
      const validatedData = insertCurriculumItemSchema.parse(req.body);
      const item = await storage.createCurriculumItem(validatedData);
      res.json(item);
    } catch (error) {
      console.error("Error creating curriculum item:", error);
      res.status(500).json({ message: "Failed to create curriculum item" });
    }
  });

  app.patch("/api/admin/curriculum/:id", isAdmin, async (req: any, res) => {
    try {
      const item = await storage.updateCurriculumItem(req.params.id, req.body);
      res.json(item);
    } catch (error) {
      console.error("Error updating curriculum item:", error);
      res.status(500).json({ message: "Failed to update curriculum item" });
    }
  });

  app.delete("/api/admin/curriculum/:id", isAdmin, async (req: any, res) => {
    try {
      await storage.deleteCurriculumItem(req.params.id);
      res.json({ message: "Curriculum item deleted" });
    } catch (error) {
      console.error("Error deleting curriculum item:", error);
      res.status(500).json({ message: "Failed to delete curriculum item" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

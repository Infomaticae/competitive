import { ExamQuestion } from "@shared/schema";

export interface ScoringResult {
  score: number;
  totalMarks: number;
  correctCount: number;
  wrongCount: number;
  unattemptedCount: number;
}

export function calculateExamScore(
  questions: ExamQuestion[],
  answers: Record<string, number>,
  examPattern?: string | null
): ScoringResult {
  let score = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let unattemptedCount = 0;

  questions.forEach((question) => {
    const userAnswer = answers[question.id];
    
    if (userAnswer === undefined || userAnswer === -1) {
      // Unattempted
      unattemptedCount++;
      // No marks for unattempted
      return;
    }

    const isCorrect = userAnswer === question.correctAnswer;

    if (isCorrect) {
      correctCount++;
      score += 4; // +4 for all correct answers
    } else {
      wrongCount++;
      
      // Negative marking rules
      if (examPattern === "JEE" && question.questionType === "numerical") {
        // JEE numerical: no negative marking
        // score += 0
      } else {
        // NEET and JEE MCQ: -1 for wrong answer
        score -= 1;
      }
    }
  });

  // Calculate total marks
  const totalMarks = questions.length * 4;

  return {
    score,
    totalMarks,
    correctCount,
    wrongCount,
    unattemptedCount,
  };
}

export interface ExamPattern {
  name: string;
  totalQuestions: number;
  subjects: {
    name: string;
    questionCount: number;
    mcqCount?: number;
    numericalCount?: number;
    subSubjects?: { name: string; questionCount: number }[];
  }[];
}

export const NEET_PATTERN: ExamPattern = {
  name: "NEET",
  totalQuestions: 180,
  subjects: [
    {
      name: "Physics",
      questionCount: 45,
    },
    {
      name: "Chemistry",
      questionCount: 45,
    },
    {
      name: "Biology",
      questionCount: 90,
      subSubjects: [
        { name: "Botany", questionCount: 45 },
        { name: "Zoology", questionCount: 45 },
      ],
    },
  ],
};

export const JEE_PATTERN: ExamPattern = {
  name: "JEE",
  totalQuestions: 75,
  subjects: [
    {
      name: "Physics",
      questionCount: 25,
      mcqCount: 20,
      numericalCount: 5,
    },
    {
      name: "Chemistry",
      questionCount: 25,
      mcqCount: 20,
      numericalCount: 5,
    },
    {
      name: "Mathematics",
      questionCount: 25,
      mcqCount: 20,
      numericalCount: 5,
    },
  ],
};

export function getExamPattern(stream: string): ExamPattern {
  return stream === "medical" ? NEET_PATTERN : JEE_PATTERN;
}

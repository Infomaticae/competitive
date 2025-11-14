import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface GeneratedQuestion {
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  subject: string;
  subSubject?: string;
}

export async function generatePracticeTest(
  level: string,
  stream: string,
  numQuestions: number = 10,
): Promise<GeneratedQuestion[]> {
  // Determine subjects based on stream
  const subjects =
    stream === "engineering"
      ? ["Physics", "Chemistry", "Mathematics"]
      : ["Physics", "Chemistry", "Biology"];

  const subjectInfo =
    stream === "engineering"
      ? "Physics, Chemistry, and Mathematics"
      : "Physics, Chemistry, and Biology (split between Botany and Zoology)";

  const prompt = `Generate ${numQuestions} multiple choice questions for a ${level} level ${stream} entrance exam practice test. 

Distribute questions evenly across ${subjectInfo}. For each question, provide:
- A clear question text appropriate for ${level} level ${stream} students
- Exactly 4 options (labeled A, B, C, D)
- The index (0-3) of the correct answer
- A brief explanation of why that answer is correct
- The subject field (Physics, Chemistry, ${stream === "engineering" ? "Mathematics" : "Biology"})
${stream === "medical" ? '- The subSubject field for Biology questions (either "Botany" or "Zoology")' : ""}

Return the response as a JSON array of objects with this structure:
[
  {
    "questionText": "Question here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Explanation here",
    "subject": "Physics"${stream === "medical" ? ',\n    "subSubject": "Botany" // Only for Biology questions' : ""}
  }
]

Make the questions challenging but fair for ${level} level students. Distribute questions roughly equally across all subjects.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are an expert exam creator for engineering and medical entrance exams. Generate high-quality, accurate questions with clear explanations.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No content generated");
  }

  const parsed = JSON.parse(content);
  const questions = parsed.questions || parsed;

  // Ensure all questions have subject information
  return questions.map((q: any, index: number) => {
    // If AI didn't provide subject, assign one in round-robin fashion
    if (!q.subject) {
      q.subject = subjects[index % subjects.length];
    }
    // For medical stream, ensure Biology questions have a subSubject
    if (stream === "medical" && q.subject === "Biology" && !q.subSubject) {
      q.subSubject = index % 2 === 0 ? "Botany" : "Zoology";
    }
    return q;
  });
}

export async function generateExamQuestions(
  examPattern: string,
  subject: string,
  questionType: string,
  numQuestions: number,
  level: string,
  stream: string,
): Promise<
  Array<{
    questionText: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    subject: string;
    questionType: string;
  }>
> {
  const patternInfo =
    examPattern === "NEET"
      ? "NEET exam pattern with MCQ questions"
      : examPattern === "JEE"
        ? `JEE exam pattern with ${questionType === "numerical" ? "numerical answer type" : "MCQ"} questions`
        : "standard exam pattern";

  const questionTypeInfo =
    questionType === "numerical"
      ? "Generate numerical answer questions where the answer is a number (not multiple choice). For options array, put the correct numerical answer as the first item, and 3 similar but incorrect numbers as the other options. The correctAnswer index should be 0."
      : "Generate multiple choice questions with exactly 4 options.";

  const prompt = `***CRITICAL: You MUST generate EXACTLY ${numQuestions} questions. This is a strict requirement.

Generate ${numQuestions} ${subject} questions for a ${level} level ${stream} entrance exam following ${patternInfo}.

${questionTypeInfo}

For each question, provide:
- A clear, challenging question text appropriate for ${level} level
- Exactly 4 options for MCQ OR numerical answer and 3 distractors for numerical type
- The index (0-3) of the correct answer
- Each option should be unique and plausible
- A detailed explanation

IMPORTANT: Return EXACTLY ${numQuestions} questions in a JSON array with a "questions" key:
{
  "questions": [
    {
      "questionText": "Question here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Detailed explanation",
      "subject": "${subject}",
      "questionType": "${questionType}"
    }
  ]
}

The array MUST contain EXACTLY ${numQuestions} question objects. Do not generate fewer or more.`;

  // Retry logic - attempt up to 3 times to get the correct number of questions
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert exam creator for ${stream} entrance exams. Generate high-quality, accurate ${subject} questions following ${examPattern} pattern standards. CRITICAL: Always generate the EXACT number of questions requested.`,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content generated");
      }

      const parsed = JSON.parse(content);
      const questions = parsed.questions || parsed;

      // Validate question count
      if (!Array.isArray(questions)) {
        throw new Error("Response is not an array");
      }

      if (questions.length !== numQuestions) {
        console.log(
          `[Attempt ${attempt}/${maxRetries}] AI returned ${questions.length} questions, expected ${numQuestions}`,
        );
        if (attempt < maxRetries) {
          continue; // Retry
        } else {
          throw new Error(
            `AI failed to generate exactly ${numQuestions} questions after ${maxRetries} attempts. Last attempt returned ${questions.length} questions.`,
          );
        }
      }

      // Success - return the questions
      console.log(
        `[Attempt ${attempt}/${maxRetries}] Successfully generated ${questions.length} questions for ${subject} ${questionType}`,
      );
      return questions.map((q: any) => ({
        ...q,
        subject: subject,
        questionType: questionType,
      }));
    } catch (error) {
      if (attempt === maxRetries) {
        throw error; // Rethrow on final attempt
      }
      console.log(
        `[Attempt ${attempt}/${maxRetries}] Error generating questions:`,
        error,
      );
    }
  }

  throw new Error("Failed to generate questions after all retry attempts");
}

export async function generateRevisionContent(
  level: string,
  stream: string,
  score: number,
  totalQuestions: number,
  wrongQuestions: Array<{
    questionText: string;
    correctAnswer: string;
    userAnswer: string;
  }>,
): Promise<string> {
  const percentage = Math.round((score / totalQuestions) * 100);

  const wrongQuestionsText =
    wrongQuestions.length > 0
      ? wrongQuestions
          .map(
            (q, i) =>
              `${i + 1}. Question: ${q.questionText}\n   Your answer: ${q.userAnswer}\n   Correct answer: ${q.correctAnswer}`,
          )
          .join("\n\n")
      : "No incorrect answers";

  const prompt = `A ${level} level ${stream} student just completed a practice test with the following results:
- Score: ${score}/${totalQuestions} (${percentage}%)
- Number of incorrect answers: ${wrongQuestions.length}

Incorrect questions:
${wrongQuestionsText}

Based on their performance, provide:
1. A brief encouraging assessment of their performance
2. Key concepts they need to review (based on their mistakes)
3. Specific study recommendations for ${level} level ${stream} topics
4. Tips for improving their score

Keep it concise, supportive, and actionable. Format it in clean markdown with headings.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a supportive tutor helping students prepare for entrance exams. Provide personalized, encouraging feedback with specific study recommendations.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.7,
    max_tokens: 800,
  });

  return (
    response.choices[0].message.content ||
    "Unable to generate revision content at this time."
  );
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function chatAboutQuestion(
  questionText: string,
  options: string[],
  correctAnswer: number,
  studentAnswer: number | null,
  explanation: string,
  subject: string,
  chatHistory: ChatMessage[],
  userMessage: string,
  level: string,
  stream: string,
): Promise<string> {
  const optionsText = options
    .map((opt, idx) => `${String.fromCharCode(65 + idx)}. ${opt}`)
    .join("\n");
  const correctAnswerText = options[correctAnswer];
  const studentAnswerText =
    studentAnswer !== null ? options[studentAnswer] : "Not attempted";
  const isCorrect = studentAnswer === correctAnswer;

  const systemPrompt = `You are a helpful tutor for ${level} level ${stream} students preparing for entrance exams. You're helping a student understand a ${subject} question they encountered in their exam.

Question Context:
${questionText}

Options:
${optionsText}

Correct Answer: ${String.fromCharCode(65 + correctAnswer)}. ${correctAnswerText}
Student's Answer: ${studentAnswer !== null ? String.fromCharCode(65 + studentAnswer) + ". " + studentAnswerText : "Not attempted"}
Result: ${isCorrect ? "✓ Correct" : studentAnswer !== null ? "✗ Incorrect" : "○ Unattempted"}

Explanation: ${explanation}

Your role:
- Answer the student's questions about this problem
- Help them understand why their answer was ${isCorrect ? "correct" : studentAnswer !== null ? "incorrect" : "not answered"}
- Explain concepts in a clear, supportive way
- Provide additional insights or related concepts when relevant
- Keep responses concise but thorough
- Be encouraging and help build their confidence

IMPORTANT - Mathematical Notation:
- Use LaTeX notation for ALL mathematical formulas and equations
- For inline math, wrap expressions in single dollar signs: $expression$
  Example: The quadratic formula is $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$
- For block/display math, wrap expressions in double dollar signs: $$expression$$
  Example: $$E = mc^2$$
- Common LaTeX commands you can use:
  - Fractions: \\frac{numerator}{denominator}
  - Square root: \\sqrt{x}
  - Exponents: x^2 or x^{10}
  - Subscripts: x_1 or x_{ab}
  - Greek letters: \\alpha, \\beta, \\gamma, \\theta, \\pi, etc.
  - Trigonometric: \\sin, \\cos, \\tan
  - Calculus: \\int, \\sum, \\lim, \\frac{d}{dx}
- Always use proper LaTeX formatting for chemical formulas too
  Example: $H_2O$, $CO_2$, $CaCO_3$

Remember: This is about learning and understanding, not just getting the right answer.`;

  const messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [
    { role: "system", content: systemPrompt },
    ...chatHistory,
    { role: "user", content: userMessage },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.7,
    max_tokens: 500,
  });

  return (
    response.choices[0].message.content ||
    "I'm having trouble responding right now. Please try again."
  );
}

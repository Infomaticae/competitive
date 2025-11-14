// Seed data for the LMS platform with NEET and JEE exam patterns
import { db } from "./db";
import { examSets, examQuestions, curriculumItems } from "@shared/schema";

async function seed() {
  console.log("🌱 Seeding database...");

  // Helper function to create NEET exam set (Medical stream)
  async function createNEETExam(level: string, setNumber: number, isPractice: boolean = false) {
    const title = isPractice 
      ? `${level.charAt(0).toUpperCase() + level.slice(1)} NEET Practice Test ${setNumber}`
      : `${level.charAt(0).toUpperCase() + level.slice(1)} NEET Qualifying Exam ${setNumber}`;
    
    const [examSet] = await db.insert(examSets).values({
      level,
      stream: "medical",
      setNumber,
      title,
      description: "NEET Pattern: 180 questions (Physics-45, Chemistry-45, Biology-90) | +4 correct, -1 wrong, 0 unattempted | 720 marks",
      totalQuestions: 180,
      passingPercentage: 95,
      isPractice,
      examPattern: "NEET",
    }).returning();

    const questions = [];
    let orderIndex = 0;

    // Physics - 45 questions (MCQ only)
    for (let i = 0; i < 45; i++) {
      questions.push({
        examSetId: examSet.id,
        questionText: `Physics Question ${i + 1} for ${level} level: Sample question about mechanics, electricity, or modern physics.`,
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: Math.floor(Math.random() * 4),
        explanation: `This is a sample physics question explanation for ${level} level.`,
        subject: "Physics",
        questionType: "mcq",
        orderIndex: orderIndex++,
      });
    }

    // Chemistry - 45 questions (MCQ only)
    for (let i = 0; i < 45; i++) {
      questions.push({
        examSetId: examSet.id,
        questionText: `Chemistry Question ${i + 1} for ${level} level: Sample question about organic, inorganic, or physical chemistry.`,
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: Math.floor(Math.random() * 4),
        explanation: `This is a sample chemistry question explanation for ${level} level.`,
        subject: "Chemistry",
        questionType: "mcq",
        orderIndex: orderIndex++,
      });
    }

    // Biology - Botany - 45 questions (MCQ only)
    for (let i = 0; i < 45; i++) {
      questions.push({
        examSetId: examSet.id,
        questionText: `Botany Question ${i + 1} for ${level} level: Sample question about plant biology, photosynthesis, or plant anatomy.`,
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: Math.floor(Math.random() * 4),
        explanation: `This is a sample botany question explanation for ${level} level.`,
        subject: "Biology",
        subSubject: "Botany",
        questionType: "mcq",
        orderIndex: orderIndex++,
      });
    }

    // Biology - Zoology - 45 questions (MCQ only)
    for (let i = 0; i < 45; i++) {
      questions.push({
        examSetId: examSet.id,
        questionText: `Zoology Question ${i + 1} for ${level} level: Sample question about animal biology, human physiology, or genetics.`,
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: Math.floor(Math.random() * 4),
        explanation: `This is a sample zoology question explanation for ${level} level.`,
        subject: "Biology",
        subSubject: "Zoology",
        questionType: "mcq",
        orderIndex: orderIndex++,
      });
    }

    await db.insert(examQuestions).values(questions);
    console.log(`✅ Created NEET exam: ${title} with 180 questions`);
  }

  // Helper function to create JEE exam set (Engineering stream)
  async function createJEEExam(level: string, setNumber: number, isPractice: boolean = false) {
    const title = isPractice
      ? `${level.charAt(0).toUpperCase() + level.slice(1)} JEE Practice Test ${setNumber}`
      : `${level.charAt(0).toUpperCase() + level.slice(1)} JEE Qualifying Exam ${setNumber}`;
    
    const [examSet] = await db.insert(examSets).values({
      level,
      stream: "engineering",
      setNumber,
      title,
      description: "JEE Pattern: 75 questions (Physics-25, Chemistry-25, Math-25) | Each: 20 MCQ + 5 Numerical | MCQ: +4/-1, Numerical: +4/0 | 300 marks",
      totalQuestions: 75,
      passingPercentage: 95,
      isPractice,
      examPattern: "JEE",
    }).returning();

    const questions = [];
    let orderIndex = 0;

    const subjects = ["Physics", "Chemistry", "Mathematics"];

    for (const subject of subjects) {
      // 20 MCQ questions per subject
      for (let i = 0; i < 20; i++) {
        questions.push({
          examSetId: examSet.id,
          questionText: `${subject} MCQ ${i + 1} for ${level} level: Sample multiple choice question with +4 for correct, -1 for wrong.`,
          options: ["Option A", "Option B", "Option C", "Option D"],
          correctAnswer: Math.floor(Math.random() * 4),
          explanation: `This is a sample ${subject} MCQ explanation for ${level} level.`,
          subject,
          questionType: "mcq",
          orderIndex: orderIndex++,
        });
      }

      // 5 Numerical questions per subject
      for (let i = 0; i < 5; i++) {
        questions.push({
          examSetId: examSet.id,
          questionText: `${subject} Numerical ${i + 1} for ${level} level: Sample numerical problem with +4 for correct, no negative marking.`,
          options: [], // Numerical questions don't have options
          correctAnswer: Math.floor(Math.random() * 100), // Store the numerical answer
          explanation: `This is a sample ${subject} numerical explanation for ${level} level.`,
          subject,
          questionType: "numerical",
          orderIndex: orderIndex++,
        });
      }
    }

    await db.insert(examQuestions).values(questions);
    console.log(`✅ Created JEE exam: ${title} with 75 questions`);
  }

  // Create NEET exams (Medical stream) for all levels
  await createNEETExam("foundation", 1);
  await createNEETExam("foundation", 2);
  await createNEETExam("foundation", 1, true); // Practice exam
  
  await createNEETExam("basic", 1);
  await createNEETExam("basic", 2);
  await createNEETExam("basic", 1, true); // Practice exam
  
  await createNEETExam("main", 1);
  await createNEETExam("main", 2);
  await createNEETExam("main", 1, true); // Practice exam
  
  await createNEETExam("advanced", 1);
  await createNEETExam("advanced", 2);
  await createNEETExam("advanced", 1, true); // Practice exam

  // Create JEE exams (Engineering stream) for all levels
  await createJEEExam("foundation", 1);
  await createJEEExam("foundation", 2);
  await createJEEExam("foundation", 1, true); // Practice exam
  
  await createJEEExam("basic", 1);
  await createJEEExam("basic", 2);
  await createJEEExam("basic", 1, true); // Practice exam
  
  await createJEEExam("main", 1);
  await createJEEExam("main", 2);
  await createJEEExam("main", 1, true); // Practice exam
  
  await createJEEExam("advanced", 1);
  await createJEEExam("advanced", 2);
  await createJEEExam("advanced", 1, true); // Practice exam

  // Create curriculum items
  console.log("📚 Creating curriculum items...");

  const curriculumData = [
    // Medical - Foundation
    {
      level: "foundation",
      stream: "medical",
      title: "Introduction to Physics",
      description: "Basic concepts of physics for NEET preparation",
      content: "Study material covering fundamental physics concepts including mechanics, heat, and light.",
      orderIndex: 1,
    },
    {
      level: "foundation",
      stream: "medical",
      title: "Introduction to Chemistry",
      description: "Basic concepts of chemistry for NEET preparation",
      content: "Study material covering fundamental chemistry concepts including atomic structure, periodic table, and chemical bonding.",
      orderIndex: 2,
    },
    {
      level: "foundation",
      stream: "medical",
      title: "Introduction to Biology",
      description: "Basic concepts of biology for NEET preparation",
      content: "Study material covering fundamental biology concepts including cell biology, genetics, and human physiology.",
      orderIndex: 3,
    },
    // Engineering - Foundation
    {
      level: "foundation",
      stream: "engineering",
      title: "Introduction to Physics",
      description: "Basic concepts of physics for JEE preparation",
      content: "Study material covering fundamental physics concepts including mechanics, electricity, and modern physics.",
      orderIndex: 1,
    },
    {
      level: "foundation",
      stream: "engineering",
      title: "Introduction to Chemistry",
      description: "Basic concepts of chemistry for JEE preparation",
      content: "Study material covering fundamental chemistry concepts including organic, inorganic, and physical chemistry.",
      orderIndex: 2,
    },
    {
      level: "foundation",
      stream: "engineering",
      title: "Introduction to Mathematics",
      description: "Basic concepts of mathematics for JEE preparation",
      content: "Study material covering fundamental mathematics concepts including algebra, trigonometry, and calculus.",
      orderIndex: 3,
    },
  ];

  await db.insert(curriculumItems).values(curriculumData);
  console.log(`✅ Created ${curriculumData.length} curriculum items`);

  console.log("✨ Seeding completed successfully!");
  console.log("📊 Summary:");
  console.log("  - NEET exams: 12 (3 per level: 2 qualifying + 1 practice)");
  console.log("  - JEE exams: 12 (3 per level: 2 qualifying + 1 practice)");
  console.log("  - Curriculum items: 6 (3 per stream for foundation level)");
}

seed()
  .then(() => {
    console.log("✅ Seed completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  });

import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table for email/username password authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").notNull().unique(),
  email: varchar("email").notNull().unique(),
  passwordHash: varchar("password_hash").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  emailVerified: boolean("email_verified").notNull().default(false),
  verificationToken: varchar("verification_token"),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Admin accounts with username/password authentication
export const admins = pgTable("admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").notNull().unique(),
  passwordHash: varchar("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Admin = typeof admins.$inferSelect;

// Student profiles with stream and level tracking
export const studentProfiles = pgTable("student_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stream: varchar("stream").notNull(), // "engineering" or "medical"
  currentLevel: varchar("current_level").notNull().default("foundation"), // foundation, basic, main, advanced
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const studentProfilesRelations = relations(studentProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [studentProfiles.userId],
    references: [users.id],
  }),
  examAttempts: many(examAttempts),
}));

export const insertStudentProfileSchema = createInsertSchema(studentProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStudentProfile = z.infer<typeof insertStudentProfileSchema>;
export type StudentProfile = typeof studentProfiles.$inferSelect;

// Exam sets - Multiple sets per level and stream
export const examSets = pgTable("exam_sets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  level: varchar("level").notNull(), // foundation, basic, main, advanced
  stream: varchar("stream").notNull(), // engineering, medical
  setNumber: integer("set_number").notNull(), // 1, 2, 3, etc.
  title: varchar("title").notNull(),
  description: text("description"),
  totalQuestions: integer("total_questions").notNull().default(30),
  passingPercentage: integer("passing_percentage").notNull().default(95),
  isPractice: boolean("is_practice").notNull().default(false), // true for practice/mock exams
  examPattern: varchar("exam_pattern"), // "NEET" or "JEE" - defines question distribution and scoring
  createdAt: timestamp("created_at").defaultNow(),
});

export const examSetsRelations = relations(examSets, ({ many }) => ({
  questions: many(examQuestions),
  attempts: many(examAttempts),
}));

export const insertExamSetSchema = createInsertSchema(examSets).omit({
  id: true,
  createdAt: true,
});

export type InsertExamSet = z.infer<typeof insertExamSetSchema>;
export type ExamSet = typeof examSets.$inferSelect;

// Exam questions
export const examQuestions = pgTable("exam_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  examSetId: varchar("exam_set_id").notNull().references(() => examSets.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  options: jsonb("options").notNull().$type<string[]>(), // Array of 4 options
  correctAnswer: integer("correct_answer").notNull(), // Index 0-3 for MCQ, actual number for Numerical
  explanation: text("explanation"),
  subject: varchar("subject").notNull().default("Physics"), // Physics, Chemistry, Biology, Mathematics
  subSubject: varchar("sub_subject"), // For Biology: Botany or Zoology
  questionType: varchar("question_type").notNull().default("mcq"), // "mcq" or "numerical"
  orderIndex: integer("order_index").notNull().default(0), // To maintain question order
  createdAt: timestamp("created_at").defaultNow(),
});

export const examQuestionsRelations = relations(examQuestions, ({ one }) => ({
  examSet: one(examSets, {
    fields: [examQuestions.examSetId],
    references: [examSets.id],
  }),
}));

export const insertExamQuestionSchema = createInsertSchema(examQuestions).omit({
  id: true,
  createdAt: true,
});

export type InsertExamQuestion = z.infer<typeof insertExamQuestionSchema>;
export type ExamQuestion = typeof examQuestions.$inferSelect;

// Exam attempts
export const examAttempts = pgTable("exam_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentProfileId: varchar("student_profile_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  examSetId: varchar("exam_set_id").references(() => examSets.id, { onDelete: "cascade" }), // Nullable for AI-generated exams
  aiExamId: varchar("ai_exam_id").references(() => aiGeneratedExams.id, { onDelete: "cascade" }), // Nullable, only for AI-generated exam attempts
  answers: jsonb("answers").notNull().$type<Record<string, number>>(), // questionId -> answerIndex (or index -> answerIndex for AI exams)
  score: integer("score").notNull(),
  totalQuestions: integer("total_questions").notNull(),
  percentage: integer("percentage").notNull(),
  passed: boolean("passed").notNull(),
  revisionContent: text("revision_content"), // AI-generated revision content
  completedAt: timestamp("completed_at").defaultNow(),
});

export const examAttemptsRelations = relations(examAttempts, ({ one }) => ({
  studentProfile: one(studentProfiles, {
    fields: [examAttempts.studentProfileId],
    references: [studentProfiles.id],
  }),
  examSet: one(examSets, {
    fields: [examAttempts.examSetId],
    references: [examSets.id],
  }),
}));

export const insertExamAttemptSchema = createInsertSchema(examAttempts).omit({
  id: true,
  completedAt: true,
});

export type InsertExamAttempt = z.infer<typeof insertExamAttemptSchema>;
export type ExamAttempt = typeof examAttempts.$inferSelect;

// Curriculum content
export const curriculumItems = pgTable("curriculum_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  level: varchar("level").notNull(), // foundation, basic, main, advanced
  stream: varchar("stream").notNull(), // engineering, medical
  title: varchar("title").notNull(),
  description: text("description"),
  content: text("content").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCurriculumItemSchema = createInsertSchema(curriculumItems).omit({
  id: true,
  createdAt: true,
});

export type InsertCurriculumItem = z.infer<typeof insertCurriculumItemSchema>;
export type CurriculumItem = typeof curriculumItems.$inferSelect;

// AI-generated exams
export const aiGeneratedExams = pgTable("ai_generated_exams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentProfileId: varchar("student_profile_id").notNull().references(() => studentProfiles.id, { onDelete: "cascade" }),
  level: varchar("level").notNull(), // foundation, basic, main, advanced
  stream: varchar("stream").notNull(), // engineering, medical
  title: varchar("title").notNull(),
  questions: jsonb("questions").notNull().$type<Array<{
    questionText: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    subject: string; // Physics, Chemistry, Biology, Mathematics
    subSubject?: string; // For Biology: Botany or Zoology
  }>>(),
  totalQuestions: integer("total_questions").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const aiGeneratedExamsRelations = relations(aiGeneratedExams, ({ one }) => ({
  studentProfile: one(studentProfiles, {
    fields: [aiGeneratedExams.studentProfileId],
    references: [studentProfiles.id],
  }),
}));

export const insertAiGeneratedExamSchema = createInsertSchema(aiGeneratedExams).omit({
  id: true,
  createdAt: true,
});

export type InsertAiGeneratedExam = z.infer<typeof insertAiGeneratedExamSchema>;
export type AiGeneratedExam = typeof aiGeneratedExams.$inferSelect;

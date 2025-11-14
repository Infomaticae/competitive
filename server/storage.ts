// Database storage implementation - Referenced from blueprints
import {
  users,
  admins,
  studentProfiles,
  examSets,
  examQuestions,
  examAttempts,
  curriculumItems,
  aiGeneratedExams,
  type User,
  type Admin,
  type StudentProfile,
  type InsertStudentProfile,
  type ExamSet,
  type InsertExamSet,
  type ExamQuestion,
  type InsertExamQuestion,
  type ExamAttempt,
  type InsertExamAttempt,
  type CurriculumItem,
  type InsertCurriculumItem,
  type AiGeneratedExam,
  type InsertAiGeneratedExam,
  type InsertUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, notInArray, inArray, or } from "drizzle-orm";

export interface IStorage {
  // User operations (for authentication)
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByUsernameOrEmail(username: string, email: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  createUser(user: Omit<InsertUser, "id" | "createdAt" | "updatedAt">): Promise<User>;
  verifyUserEmail(userId: string): Promise<User>;
  updateUserVerificationToken(userId: string, token: string): Promise<User>;

  // Admin operations
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  getAdminById(id: string): Promise<Admin | undefined>;

  // Student Profile operations
  getStudentProfile(userId: string): Promise<StudentProfile | undefined>;
  createStudentProfile(profile: InsertStudentProfile): Promise<StudentProfile>;
  updateStudentLevel(profileId: string, level: string): Promise<StudentProfile>;

  // Exam Set operations
  getExamSets(level: string, stream: string): Promise<ExamSet[]>;
  getExamSet(id: string): Promise<ExamSet | undefined>;
  createExamSet(examSet: InsertExamSet): Promise<ExamSet>;
  getAvailableExamSet(level: string, stream: string, attemptedSetIds: string[]): Promise<ExamSet | undefined>;

  // Exam Question operations
  getQuestionsByExamSet(examSetId: string): Promise<ExamQuestion[]>;
  createExamQuestion(question: InsertExamQuestion): Promise<ExamQuestion>;

  // Exam Attempt operations
  getExamAttempts(profileId: string): Promise<(ExamAttempt & { examSet: ExamSet | null })[]>;
  getExamAttempt(id: string): Promise<ExamAttempt | undefined>;
  createExamAttempt(attempt: InsertExamAttempt): Promise<ExamAttempt>;

  // Curriculum operations
  getCurriculumItems(level: string, stream: string): Promise<CurriculumItem[]>;
  createCurriculumItem(item: InsertCurriculumItem): Promise<CurriculumItem>;
  updateCurriculumItem(id: string, item: Partial<InsertCurriculumItem>): Promise<CurriculumItem>;
  deleteCurriculumItem(id: string): Promise<void>;

  // Admin operations
  getAllExamSets(): Promise<ExamSet[]>;
  updateExamSet(id: string, data: Partial<InsertExamSet>): Promise<ExamSet>;
  deleteExamSet(id: string): Promise<void>;
  updateExamQuestion(id: string, data: Partial<InsertExamQuestion>): Promise<ExamQuestion>;
  deleteExamQuestion(id: string): Promise<void>;
  getAllCurriculumItems(): Promise<CurriculumItem[]>;

  // AI-generated exam operations
  createAiGeneratedExam(exam: InsertAiGeneratedExam): Promise<AiGeneratedExam>;
  getAiGeneratedExam(id: string): Promise<AiGeneratedExam | undefined>;
  getAiGeneratedExams(studentProfileId: string): Promise<AiGeneratedExam[]>;
  updateExamAttemptRevision(attemptId: string, revisionContent: string): Promise<ExamAttempt>;
}

export class DatabaseStorage implements IStorage {
  // User operations (for authentication)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsernameOrEmail(username: string, email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(or(eq(users.username, username), eq(users.email, email)));
    return user;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.verificationToken, token));
    return user;
  }

  async createUser(userData: Omit<InsertUser, "id" | "createdAt" | "updatedAt">): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async verifyUserEmail(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        emailVerified: true, 
        verificationToken: null,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserVerificationToken(userId: string, token: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        verificationToken: token,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Admin operations
  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.username, username));
    return admin;
  }

  async getAdminById(id: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.id, id));
    return admin;
  }

  // Student Profile operations
  async getStudentProfile(userId: string): Promise<StudentProfile | undefined> {
    const [profile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, userId));
    return profile;
  }

  async createStudentProfile(profileData: InsertStudentProfile): Promise<StudentProfile> {
    const [profile] = await db
      .insert(studentProfiles)
      .values(profileData)
      .returning();
    return profile;
  }

  async updateStudentLevel(profileId: string, level: string): Promise<StudentProfile> {
    const [profile] = await db
      .update(studentProfiles)
      .set({ currentLevel: level, updatedAt: new Date() })
      .where(eq(studentProfiles.id, profileId))
      .returning();
    return profile;
  }

  // Exam Set operations
  async getExamSets(level: string, stream: string): Promise<ExamSet[]> {
    return await db
      .select()
      .from(examSets)
      .where(and(eq(examSets.level, level), eq(examSets.stream, stream)));
  }

  async getExamSet(id: string): Promise<ExamSet | undefined> {
    const [examSet] = await db.select().from(examSets).where(eq(examSets.id, id));
    return examSet;
  }

  async createExamSet(examSetData: InsertExamSet): Promise<ExamSet> {
    const [examSet] = await db.insert(examSets).values(examSetData).returning();
    return examSet;
  }

  async getAvailableExamSet(
    level: string,
    stream: string,
    attemptedSetIds: string[]
  ): Promise<ExamSet | undefined> {
    if (attemptedSetIds.length > 0) {
      const [examSet] = await db
        .select()
        .from(examSets)
        .where(
          and(
            eq(examSets.level, level),
            eq(examSets.stream, stream),
            notInArray(examSets.id, attemptedSetIds)
          )
        )
        .limit(1);
      return examSet;
    }

    const [examSet] = await db
      .select()
      .from(examSets)
      .where(and(eq(examSets.level, level), eq(examSets.stream, stream)))
      .limit(1);
    return examSet;
  }

  // Exam Question operations
  async getQuestionsByExamSet(examSetId: string): Promise<ExamQuestion[]> {
    return await db
      .select()
      .from(examQuestions)
      .where(eq(examQuestions.examSetId, examSetId));
  }

  async createExamQuestion(questionData: InsertExamQuestion): Promise<ExamQuestion> {
    const data: any = questionData;
    const [question] = await db.insert(examQuestions).values(data).returning();
    return question;
  }

  // Exam Attempt operations
  async getExamAttempts(profileId: string): Promise<(ExamAttempt & { examSet: ExamSet | null })[]> {
    const attempts = await db
      .select({
        attempt: examAttempts,
        examSet: examSets,
      })
      .from(examAttempts)
      .leftJoin(examSets, eq(examAttempts.examSetId, examSets.id))
      .where(eq(examAttempts.studentProfileId, profileId))
      .orderBy(examAttempts.completedAt);
    
    return attempts.map(row => ({
      ...row.attempt,
      examSet: row.examSet,
    }));
  }

  async getExamAttempt(id: string): Promise<ExamAttempt | undefined> {
    const [attempt] = await db.select().from(examAttempts).where(eq(examAttempts.id, id));
    return attempt;
  }

  async createExamAttempt(attemptData: InsertExamAttempt): Promise<ExamAttempt> {
    const [attempt] = await db.insert(examAttempts).values(attemptData).returning();
    return attempt;
  }

  // Curriculum operations
  async getCurriculumItems(level: string, stream: string): Promise<CurriculumItem[]> {
    return await db
      .select()
      .from(curriculumItems)
      .where(and(eq(curriculumItems.level, level), eq(curriculumItems.stream, stream)))
      .orderBy(curriculumItems.orderIndex);
  }

  async createCurriculumItem(itemData: InsertCurriculumItem): Promise<CurriculumItem> {
    const [item] = await db.insert(curriculumItems).values(itemData).returning();
    return item;
  }

  async updateCurriculumItem(id: string, itemData: Partial<InsertCurriculumItem>): Promise<CurriculumItem> {
    const [item] = await db
      .update(curriculumItems)
      .set(itemData)
      .where(eq(curriculumItems.id, id))
      .returning();
    return item;
  }

  async deleteCurriculumItem(id: string): Promise<void> {
    await db.delete(curriculumItems).where(eq(curriculumItems.id, id));
  }

  // Admin operations
  async getAllExamSets(): Promise<ExamSet[]> {
    return await db.select().from(examSets).orderBy(examSets.level, examSets.stream, examSets.setNumber);
  }

  async updateExamSet(id: string, data: Partial<InsertExamSet>): Promise<ExamSet> {
    const [examSet] = await db
      .update(examSets)
      .set(data)
      .where(eq(examSets.id, id))
      .returning();
    return examSet;
  }

  async deleteExamSet(id: string): Promise<void> {
    await db.delete(examSets).where(eq(examSets.id, id));
  }

  async updateExamQuestion(id: string, data: Partial<InsertExamQuestion>): Promise<ExamQuestion> {
    const updateData: any = data;
    const [question] = await db
      .update(examQuestions)
      .set(updateData)
      .where(eq(examQuestions.id, id))
      .returning();
    return question;
  }

  async deleteExamQuestion(id: string): Promise<void> {
    await db.delete(examQuestions).where(eq(examQuestions.id, id));
  }

  async getAllCurriculumItems(): Promise<CurriculumItem[]> {
    return await db.select().from(curriculumItems).orderBy(curriculumItems.level, curriculumItems.stream, curriculumItems.orderIndex);
  }

  // AI-generated exam operations
  async createAiGeneratedExam(exam: InsertAiGeneratedExam): Promise<AiGeneratedExam> {
    const examData: any = exam;
    const [result] = await db.insert(aiGeneratedExams).values(examData).returning();
    return result;
  }

  async getAiGeneratedExam(id: string): Promise<AiGeneratedExam | undefined> {
    const [exam] = await db.select().from(aiGeneratedExams).where(eq(aiGeneratedExams.id, id));
    return exam;
  }

  async getAiGeneratedExams(studentProfileId: string): Promise<AiGeneratedExam[]> {
    return await db.select().from(aiGeneratedExams).where(eq(aiGeneratedExams.studentProfileId, studentProfileId));
  }

  async updateExamAttemptRevision(attemptId: string, revisionContent: string): Promise<ExamAttempt> {
    const [attempt] = await db
      .update(examAttempts)
      .set({ revisionContent })
      .where(eq(examAttempts.id, attemptId))
      .returning();
    return attempt;
  }
}

export const storage = new DatabaseStorage();

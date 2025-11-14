# LMS Platform - Multi-Level Learning Management System

## Overview
A comprehensive Learning Management System designed for Engineering and Medical entrance exam preparation. Students progress through four structured levels (Foundation → Basic → Main → Advanced) by passing qualifying exams with a 95% threshold. The platform aims to provide a robust and adaptive learning environment with detailed performance analysis and AI-powered practice.

## User Preferences
I prefer detailed explanations and an iterative development approach. I want the agent to ask before making major changes and to prioritize clear communication.

## System Architecture

### UI/UX Decisions
The platform features a clean, distraction-free design, especially during exams. It uses Tailwind CSS with custom design tokens and Shadcn UI components built on Radix UI primitives. Dark mode is supported. The admin UI has a modern visual design with clear visual separation, consistent spacing, and a 4-tab organization for improved navigation.

### Technical Implementations
- **Frontend**: React, TypeScript, Wouter for routing, TanStack Query for data fetching.
- **Backend**: Express.js, Node.js, RESTful APIs.
- **Authentication**: Email/username password authentication with bcrypt hashing, SendGrid for email verification, and secure session management using PostgreSQL. A separate admin authentication system is also implemented.
- **Database**: PostgreSQL with Drizzle ORM.
- **Exam System**: Supports NEET and JEE patterns with specific question distributions, scoring rules, and question types (MCQ/Numerical). Features an instruction page, fullscreen mode during exams, subject-grouped navigation, and real-time score calculation.
- **Curriculum**: Stream-specific and level-appropriate learning materials organized by topics.
- **Student Progress**: Manages student progression through four levels, stream selection (Engineering/Medical), and qualifying exams with a 95% pass threshold.
- **AI Integration**: OpenAI (gpt-4o-mini) is integrated for generating personalized practice tests and questions, accessible via the admin panel.
- **Reporting**: Detailed exam reports provide question-by-question review, subject-wise performance breakdown, weak area identification, and personalized study suggestions.

### Feature Specifications
- **User Authentication**: Email/username registration, email verification, password hashing, session management.
- **Student Progress**: Four learning levels, stream selection, qualifying exams with 95% pass threshold.
- **Exam System**: Multiple question sets, automatic set rotation, NEET/JEE pattern support, practice mode, exam instruction page, fullscreen mode with auto-submission on exit, minimal exam interface, timer system.
- **Curriculum**: Stream-specific, level-appropriate learning materials.
- **Admin Panel**: Comprehensive CRUD interface for managing exam sets, questions, and curriculum. Includes AI-powered question generation.
- **AI-Powered Practice Tests**: Generates personalized tests based on student's current level/stream.
- **Detailed Exam Reports**: Comprehensive performance analysis, weak area identification, and study suggestions.

### System Design Choices
The system prioritizes a robust, secure, and scalable architecture. The use of Drizzle ORM and PostgreSQL ensures data integrity and efficient querying. The modular design with separate frontend and backend services allows for independent development and scaling. Session-based authentication provides secure user experiences. The implementation of specific exam patterns ensures authenticity and relevance for entrance exam preparation.

## External Dependencies
- **Database**: PostgreSQL (Neon)
- **Email Service**: SendGrid (for email verification)
- **AI Service**: OpenAI (gpt-4o-mini for question generation and practice tests)
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI, Radix UI

## Recent Enhancements (October 2025)

### Detailed Exam Reports
**Comprehensive performance analysis for all exam types (Practice, Qualifying, and AI-generated)**

#### Features:
- **Question-by-Question Review**:
  - Color-coded answers (green for correct, red for incorrect, default for unattempted)
  - Shows correct answer and explanation for each question
  - Student's answer displayed alongside correct answer
  
- **Subject-Wise Performance Breakdown**:
  - Percentage scores for each subject (Physics, Chemistry, Biology/Mathematics)
  - Visual progress bars for easy understanding
  - Sub-subject tracking (Botany/Zoology for Biology in Medical stream)
  
- **Weak Area Identification**:
  - Automatically identifies subjects scoring below 70%
  - Sorted by priority (weakest first)
  - Shows correct/total questions for each weak area
  
- **Personalized Study Suggestions**:
  - Priority-based recommendations (High/Medium/Low)
  - High Priority (<40%): "Focus heavily on..."
  - Medium Priority (40-60%): "Strengthen knowledge in..."
  - Low Priority (60-70%): "Improve slightly in..."
  
- **Summary Statistics**:
  - Total questions, attempted, correct, incorrect, unattempted
  - Overall percentage and pass/fail status

#### Technical Implementation:
- **Backend API**: GET `/api/exam-attempt/:id/details`
  - Supports both regular exam sets and AI-generated exams
  - Detects exam type via `examSetId` vs `aiExamId`
  - For AI exams: retrieves questions from `aiGeneratedExams` table (index-based answers)
  - For regular exams: retrieves from `exam_questions` table (ID-based answers)
  - Both paths generate identical analysis format
  
- **Database Schema**:
  - Added `aiExamId` field to `exam_attempts` table
  - AI exam questions now include `subject` and `subSubject` fields
  - Maintains backward compatibility with old attempts
  
- **AI Generation Enhancement**:
  - AI-generated questions now include subject distribution
  - Prompts OpenAI to distribute questions evenly across subjects
  - Fallback logic assigns subjects in round-robin if not provided
  - For Medical stream: Biology questions auto-assigned to Botany/Zoology
  
- **Frontend Pages**:
  - New `/attempt-details/:id` page with 3 tabs:
    - Performance: Subject breakdown with progress bars
    - Suggestions: Study recommendations with priority badges
    - All Questions: Complete question review with color coding
  - "View Details" buttons on Dashboard and Exam Result page
  - Works for all exam types (Practice, Qualifying, AI-generated)

#### Access Points:
- Dashboard recent attempts → "Details" button
- Exam result page → "View Details" button
- Available for both regular exam sets and AI practice tests

### AI Question Chat (October 2025)
**Interactive AI tutor for discussing exam questions after completing attempts**

#### Features:
- **Question-by-Question Chat**:
  - Collapsible chat interface on each question in the "All Questions" tab
  - Students can ask anything about the question (why answer is correct/incorrect, concept explanations, etc.)
  - Context-aware: AI knows the question, all options, correct answer, student's answer, and whether they got it right
  
- **Conversational Learning**:
  - Maintains chat history per question for follow-up questions
  - AI provides supportive, educational responses focused on understanding
  - Tailored to student's level and stream (Foundation/Basic/Main/Advanced, Engineering/Medical)
  
- **User Experience**:
  - Clean, unobtrusive design - expands only when clicked
  - User messages on right (primary color), AI messages on left (muted background)
  - Enter key support for quick messaging
  - Loading state during AI response
  - Helpful placeholder text when chat is empty
  - Suggested prompts tailored to question status (correct/incorrect/unattempted)

- **Mathematical Notation (KaTeX)**:
  - Full LaTeX support for mathematical formulas and equations
  - Inline math: `$x^2 + y^2 = r^2$` renders as formatted equation
  - Block math: `$$E = mc^2$$` renders as centered display equation
  - Works for both user messages and AI responses
  - Supports fractions, roots, exponents, Greek letters, calculus notation, and chemical formulas
  - AI automatically uses LaTeX notation when explaining mathematical concepts

#### Technical Implementation:
- **Backend API**: POST `/api/question-chat`
  - Accepts question details, student answer, chat history, and user message
  - Protected with authentication middleware
  - Uses OpenAI gpt-4o-mini for responses
  - System prompt instructs AI to act as supportive tutor
  - Max 500 tokens per response for conciseness
  
- **OpenAI Integration**: `chatAboutQuestion` function in `openai-client.ts`
  - Provides full context: question text, all options, correct/student answers, explanation
  - Tailors responses to student's current level and stream
  - Encourages learning-focused dialogue over simple answer verification
  - System prompt instructs AI to use LaTeX notation for all mathematical expressions
  
- **Frontend**: QuestionChat component in `attempt-details.tsx`
  - Uses Shadcn Collapsible component for clean UX
  - Client-side chat history (not persisted to database)
  - TanStack Query mutation for API calls
  - Properly handles async state - uses mutation variable instead of input state to prevent history corruption
  - Suggested prompts system with contextual recommendations
  
- **KaTeX Rendering**: KaTeXText component in `attempt-details.tsx`
  - Custom parser for LaTeX notation in chat messages
  - Supports inline ($...$) and block ($$...$$) math
  - Uses katex.renderToString() with error handling
  - Block math processed first to avoid parsing conflicts
  - Graceful fallback to raw LaTeX on render errors
  - Works seamlessly with existing message styling

#### Benefits:
- Students can ask "why" and get immediate explanations
- Learn from mistakes through interactive dialogue
- Available for all questions (correct, incorrect, unattempted)
- No additional database storage needed (stateless, chat history client-side only)

### Improved Cooldown Error Messaging (October 2025)
**Clear, informative messaging when students attempt exams during the 24-hour cooldown period**

#### Features:
- **Enhanced Error Detection**:
  - Frontend properly captures error details from backend API
  - Uses type checking (`typeof error?.hoursRemaining === 'number'`) to reliably detect cooldown errors
  - Handles edge cases where hours remaining could be 0
  
- **Detailed User Messaging**:
  - Dedicated "Exam Cooldown Active" screen with warning icon
  - Clear explanation: "You must wait 24 hours between qualifying exam attempts"
  - Shows exact hours remaining until next attempt
  - Displays next available date and time in readable format
  - Explains why cooldown exists: "ensures fair testing and prevents exam fatigue"
  
- **User Actions During Cooldown**:
  - "Back to Dashboard" button to return to main page
  - "Try Practice Mode" button to practice while waiting
  - Encourages productive use of waiting time
  
- **Other Error Types**:
  - Maintains handling for "No practice sets available"
  - Maintains handling for "All exam sets attempted"
  - Generic "No exam available" for other scenarios

#### Technical Implementation:
- **Backend** (`/api/exam/available`):
  - Already returns 403 status with detailed error payload:
    - `message`: Explanation of cooldown
    - `hoursRemaining`: Hours until next attempt (numeric)
    - `nextAvailableAt`: ISO timestamp of next available time
  
- **Frontend** (`client/src/pages/exam.tsx`):
  - Updated `useQuery` to capture and expose error object
  - Error type includes `hoursRemaining` and `nextAvailableAt` fields
  - Robust cooldown detection using `typeof` check (handles 0 hours case)
  - Conditional rendering based on error type
  - Professional UI with AlertTriangle icon and muted background info box

#### User Experience Benefits:
- No more confusion about why exams are unavailable
- Students know exactly when they can try again
- Productive alternative (practice mode) offered during wait
- Transparent communication builds trust in the system

### Bug Fixes (October 2025)

#### AI Question Generation Fix
**Fixed critical bug preventing AI-generated questions from being saved to database**

**Problem:**
- Admin could generate questions using AI through the admin panel
- Questions appeared in the UI temporarily after generation
- After server restart or page refresh, questions disappeared
- Database showed 0 questions for affected exam sets

**Root Cause:**
- Parameter name mismatch between frontend and backend
- Frontend sent `count` but backend expected `numQuestions`
- Backend validation rejected requests with "Missing required fields"
- Questions were never saved to database

**Fix:**
- Updated frontend mutation to transform parameters before sending:
  - Maps `count` → `numQuestions` for backend compatibility
  - Preserves all other parameters (examSetId, subject, questionType)
- Questions now properly persist to database
- Questions survive server restarts

**Technical Details:**
- File: `client/src/pages/admin.tsx`
- Component: `AIQuestionDialog` mutation function
- Backend endpoint: `/api/admin/generate-questions` (unchanged)
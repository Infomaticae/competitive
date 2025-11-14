# LMS Platform Design Guidelines

## Design Approach
**Hybrid Approach**: Material Design foundation enhanced with modern educational platform aesthetics (Khan Academy's clarity + Linear's refinement + subtle gamification elements)

**Core Principles**:
- Educational clarity with progressive disclosure
- Achievement-oriented visual feedback
- Clean, distraction-free learning environment
- Trust-building professional aesthetics

## Color Palette

**Light Mode**:
- Primary: 217 91% 60% (Trustworthy blue for education)
- Secondary: 142 76% 36% (Success green for achievements)
- Background: 0 0% 100%
- Surface: 220 13% 97%
- Text Primary: 222 47% 11%
- Text Secondary: 215 16% 47%
- Error: 0 84% 60%
- Warning: 45 93% 47%

**Dark Mode**:
- Primary: 217 91% 70%
- Secondary: 142 76% 46%
- Background: 222 47% 11%
- Surface: 217 33% 17%
- Text Primary: 210 40% 98%
- Text Secondary: 215 20% 65%

**Level-Specific Accent Colors** (for badges/indicators):
- Foundation: 280 67% 65% (Purple - foundational)
- Basic: 217 91% 60% (Blue - building blocks)
- Main: 262 83% 58% (Violet - core competency)
- Advanced: 142 76% 36% (Green - mastery)

## Typography

**Font Stack**:
- Primary: 'Inter' (Google Fonts) - Clean, readable for long-form content
- Monospace: 'JetBrains Mono' - For exam questions/code snippets

**Hierarchy**:
- Hero/Dashboard Headers: text-4xl md:text-5xl font-bold
- Section Headers: text-2xl md:text-3xl font-semibold
- Card Titles: text-lg font-semibold
- Body Text: text-base leading-relaxed
- Labels/Meta: text-sm text-secondary
- Exam Questions: text-lg leading-relaxed

## Layout System

**Spacing Primitives**: Tailwind units 2, 4, 6, 8, 12, 16, 20, 24
- Consistent card padding: p-6 md:p-8
- Section spacing: py-12 md:py-16
- Component gaps: gap-4 to gap-6
- Dashboard grid gaps: gap-6 md:gap-8

**Container Strategy**:
- Max widths: max-w-7xl for dashboards, max-w-4xl for exams/curriculum
- Card-based layouts with subtle shadows and borders
- Sticky navigation for easy level switching

## Component Library

**Dashboard Components**:
- Progress Cards: Large cards showing current level with radial progress indicators
- Stats Grid: 3-4 column layout (md:grid-cols-3 lg:grid-cols-4) for exam attempts, scores, time spent
- Level Navigation: Horizontal stepper showing Foundation → Basic → Main → Advanced with current position highlighted
- Quick Actions: Prominent CTAs for "Take Qualifying Exam" and "View Curriculum"

**Exam Interface**:
- Clean question cards with generous padding (p-8)
- Multiple choice with radio buttons, clear visual distinction for selected state
- Fixed bottom navigation bar with "Previous/Next/Submit" buttons
- Timer component (top-right, non-intrusive)
- Progress indicator showing question number (e.g., "Question 5 of 30")

**Curriculum View**:
- Accordion/expandable sections for topics
- Video/content cards with thumbnails
- Completion checkboxes with progress tracking
- "Mark as Complete" interactions with visual feedback

**Result Pages**:
- Large score display with circular progress indicator
- Pass/Fail badge with appropriate color coding
- Detailed breakdown: Questions attempted, correct answers, time taken
- Next steps card: Either "Proceed to [Next Level]" or "Study Curriculum"

**Navigation**:
- Top navbar: Logo (left), Stream indicator (Engineering/Medical), Profile/Logout (right)
- Sidebar (desktop): Level navigation, Dashboard, My Progress, Settings
- Mobile: Bottom navigation bar for quick access

**Form Elements**:
- Registration: Multi-step form with progress indicator
- Stream selection: Large card-based selection (Engineering vs Medical)
- Input fields: Outlined style with floating labels
- Buttons: Primary (filled), Secondary (outline), sizes lg for CTAs

**Cards & Containers**:
- Elevated cards: bg-surface shadow-md rounded-lg border border-border/50
- Hover states: Subtle scale (hover:scale-[1.02]) and shadow increase
- Achievement badges: Rounded-full with level-specific colors

## Visual Enhancements

**Micro-interactions**:
- Button hover: Subtle brightness increase + scale
- Correct answer feedback: Green pulse animation
- Level completion: Confetti animation (celebrate.js)
- Progress bars: Smooth width transitions

**Iconography**:
- Heroicons for UI elements (outline style for secondary, solid for primary actions)
- Level icons: Custom illustrations or abstract geometric shapes
- Achievement badges: Trophy/medal icons with level colors

**Images**:
- Hero section: Abstract educational illustration (students learning, exam preparation theme) - 40% of viewport height, positioned right side on desktop
- Empty states: Friendly illustrations for "No exams taken yet," "Curriculum locked"
- Stream selection cards: Engineering (circuits/gears visual) vs Medical (stethoscope/anatomy visual)
- Success screens: Celebratory illustrations for level completion

## Accessibility & UX

- High contrast ratios (WCAG AAA for text)
- Focus visible states on all interactive elements
- Keyboard navigation for exam interface
- Screen reader labels for progress indicators
- Auto-save for exam progress
- Clear error messages with actionable solutions
- Loading states with skeleton screens
- Offline indicator for exam availability

## Responsive Behavior

- Mobile: Single column, bottom navigation, collapsible curriculum
- Tablet: 2-column dashboard grid, side navigation
- Desktop: Full dashboard with sidebar, multi-column stats
- Exam interface: Always single column centered (max-w-3xl) for focus

This design creates a professional, achievement-oriented learning environment that motivates students through clear progress visualization while maintaining educational clarity and accessibility.
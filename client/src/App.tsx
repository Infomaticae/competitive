import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ProfileSetup from "@/pages/profile-setup";
import Dashboard from "@/pages/dashboard";
import Exam from "@/pages/exam";
import ExamResult from "@/pages/exam-result";
import AttemptDetails from "@/pages/attempt-details";
import AIExam from "@/pages/ai-exam";
import AIExamResult from "@/pages/ai-exam-result";
import Curriculum from "@/pages/curriculum";
import Admin from "@/pages/admin";
import AdminLogin from "@/pages/admin-login";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {/* Admin routes are always accessible (have their own auth) */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={Admin} />
      
      {/* Public authentication routes */}
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Login} />
          <Route path="/login" component={Login} />
          <Route path="/register" component={Register} />
          <Route component={NotFound} />
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/profile-setup" component={ProfileSetup} />
          <Route path="/exam" component={Exam} />
          <Route path="/exam-result/:id" component={ExamResult} />
          <Route path="/attempt-details/:id" component={AttemptDetails} />
          <Route path="/ai-exam/:id" component={AIExam} />
          <Route path="/ai-exam-result/:attemptId" component={AIExamResult} />
          <Route path="/curriculum" component={Curriculum} />
          <Route component={NotFound} />
        </>
      )}
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  // Custom sidebar width for LMS
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  // Hide app sidebar for exam pages (to provide distraction-free exam environment)
  const isExamPage = location === '/exam' || location.startsWith('/exam?');

  return (
    <>
      {isAuthenticated && !isLoading ? (
        <>
          {isExamPage ? (
            // Exam pages: no app sidebar or header, just the exam content
            <main className="h-screen w-full overflow-auto">
              <Router />
            </main>
          ) : (
            // Regular pages: with app sidebar and header
            <SidebarProvider style={style as React.CSSProperties}>
              <div className="flex h-screen w-full">
                <AppSidebar />
                <div className="flex flex-col flex-1 overflow-hidden">
                  <header className="flex items-center justify-between p-3 border-b border-border bg-background shrink-0">
                    <SidebarTrigger data-testid="button-sidebar-toggle" />
                    <ThemeToggle />
                  </header>
                  <main className="flex-1 overflow-auto">
                    <div className="container mx-auto p-4 md:p-6 lg:p-8">
                      <Router />
                    </div>
                  </main>
                </div>
              </div>
            </SidebarProvider>
          )}
        </>
      ) : (
        <Router />
      )}
      <Toaster />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <AppContent />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

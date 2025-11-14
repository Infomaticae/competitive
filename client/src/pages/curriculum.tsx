import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { BookOpen, GraduationCap } from "lucide-react";
import type { CurriculumItem, StudentProfile } from "@shared/schema";

const LEVEL_LABELS: Record<string, string> = {
  foundation: "Foundation",
  basic: "Basic",
  main: "Main",
  advanced: "Advanced",
};

export default function Curriculum() {
  const { data: profile, isLoading: profileLoading } = useQuery<StudentProfile>({
    queryKey: ["/api/student-profile"],
  });

  const { data: curriculumItems = [], isLoading: curriculumLoading } = useQuery<CurriculumItem[]>({
    queryKey: ["/api/curriculum"],
    enabled: !!profile,
  });

  if (profileLoading || curriculumLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading curriculum...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <Card>
          <CardHeader>
            <CardTitle>Profile Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Please complete your profile setup to access curriculum.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl md:text-4xl font-bold mb-3">Study Curriculum</h1>
        <p className="text-lg text-muted-foreground">
          Comprehensive learning materials for your current level
        </p>
      </div>

      {/* Level Info */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">
                  {LEVEL_LABELS[profile.currentLevel]} Level
                </CardTitle>
                <CardDescription>
                  {profile.stream === "engineering" ? "Engineering" : "Medical"} Stream
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm px-4 py-2" data-testid="badge-level">
              {LEVEL_LABELS[profile.currentLevel]}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Curriculum Content */}
      {curriculumItems.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Curriculum Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Curriculum content for your level and stream is being prepared. Please check back later.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Learning Topics
            </CardTitle>
            <CardDescription>
              {curriculumItems.length} topic{curriculumItems.length !== 1 ? "s" : ""} available
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {curriculumItems.map((item, index) => (
                <AccordionItem value={item.id} key={item.id} data-testid={`curriculum-item-${index}`}>
                  <AccordionTrigger className="text-left hover:no-underline">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <span className="text-sm font-semibold">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base mb-1">{item.title}</h3>
                        {item.description && (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-11 pr-4 pt-2">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <div className="text-foreground leading-relaxed whitespace-pre-wrap">
                          {item.content}
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Study Tips */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-lg">Study Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Take your time to understand each topic thoroughly before attempting the exam</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Practice problems and review concepts multiple times for better retention</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>You need to score 95% or higher on the qualifying exam to advance to the next level</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

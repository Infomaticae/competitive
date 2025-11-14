import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, TrendingUp, Award, CheckCircle2 } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold">LMS Platform</span>
          </div>
          <Button asChild data-testid="button-login">
            <a href="/api/login">Get Started</a>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Master Your <span className="text-primary">Engineering</span> & <span className="text-primary">Medical</span> Entrance Exams
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
            Progress through four structured levels with qualifying exams. Get personalized curriculum based on your performance and unlock advanced preparation content.
          </p>
          <Button size="lg" asChild className="text-base" data-testid="button-get-started">
            <a href="/api/login">Start Your Learning Journey</a>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-semibold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          <Card className="hover-elevate">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Four-Level Progression</CardTitle>
              <CardDescription className="leading-relaxed">
                Start from Foundation and progress through Basic, Main, and Advanced levels. Each level builds on the previous one.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-chart-2/10 flex items-center justify-center mb-4">
                <Award className="w-6 h-6 text-chart-2" />
              </div>
              <CardTitle>Qualifying Exams</CardTitle>
              <CardDescription className="leading-relaxed">
                Score 95% or above to advance to the next level. Multiple exam sets ensure you're always challenged with new questions.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover-elevate">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-chart-3/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-6 h-6 text-chart-3" />
              </div>
              <CardTitle>Personalized Curriculum</CardTitle>
              <CardDescription className="leading-relaxed">
                Didn't pass? Access detailed curriculum tailored to your level and stream to strengthen your fundamentals.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Levels Overview */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-semibold text-center mb-12">Learning Levels</h2>
        <div className="max-w-4xl mx-auto space-y-4">
          {[
            { level: "Foundation", color: "chart-4", desc: "Clear fundamental concepts and build a strong base" },
            { level: "Basic", color: "chart-1", desc: "Begin entrance-level preparation with core topics" },
            { level: "Main", color: "chart-3", desc: "Master advanced concepts and problem-solving techniques" },
            { level: "Advanced", color: "chart-2", desc: "Excel in complex scenarios and achieve mastery" },
          ].map((item, idx) => (
            <Card key={item.level} className="hover-elevate">
              <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-4">
                <div className={`w-10 h-10 rounded-lg bg-${item.color}/10 flex items-center justify-center shrink-0`}>
                  <span className={`text-${item.color} font-semibold`}>{idx + 1}</span>
                </div>
                <div className="flex-1">
                  <CardTitle>{item.level}</CardTitle>
                  <CardDescription>{item.desc}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16 md:py-20">
        <Card className="max-w-3xl mx-auto bg-primary text-primary-foreground border-primary-border">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl md:text-3xl mb-4">Ready to Begin?</CardTitle>
            <CardDescription className="text-primary-foreground/90 text-base md:text-lg mb-6">
              Join thousands of students mastering their entrance exams through our structured learning platform
            </CardDescription>
            <Button size="lg" variant="secondary" asChild className="mx-auto" data-testid="button-cta">
              <a href="/api/login">Start Learning Now</a>
            </Button>
          </CardHeader>
        </Card>
      </section>
    </div>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Stethoscope, Cog, CheckCircle2 } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function ProfileSetup() {
  const [selectedStream, setSelectedStream] = useState<"engineering" | "medical" | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createProfileMutation = useMutation({
    mutationFn: async (stream: string) => {
      const response = await apiRequest("POST", "/api/student-profile", { stream });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student-profile"] });
      toast({
        title: "Profile Created",
        description: "Your learning journey begins now!",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (selectedStream) {
      createProfileMutation.mutate(selectedStream);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Welcome to Your Learning Journey</h1>
          <p className="text-lg text-muted-foreground">Choose your stream to get started</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card
            className={`cursor-pointer transition-all hover-elevate active-elevate-2 ${
              selectedStream === "engineering" ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setSelectedStream("engineering")}
            data-testid="card-stream-engineering"
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Cog className="w-8 h-8 text-primary" />
                </div>
                {selectedStream === "engineering" && (
                  <CheckCircle2 className="w-6 h-6 text-primary" data-testid="icon-selected-engineering" />
                )}
              </div>
              <CardTitle className="text-2xl">Engineering</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Prepare for engineering entrance exams with comprehensive coverage of Physics, Chemistry, and Mathematics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-chart-2" />
                  <span>Advanced Mathematics</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-chart-2" />
                  <span>Physics & Mechanics</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-chart-2" />
                  <span>Chemistry Fundamentals</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover-elevate active-elevate-2 ${
              selectedStream === "medical" ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setSelectedStream("medical")}
            data-testid="card-stream-medical"
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="w-16 h-16 rounded-lg bg-chart-2/10 flex items-center justify-center">
                  <Stethoscope className="w-8 h-8 text-chart-2" />
                </div>
                {selectedStream === "medical" && (
                  <CheckCircle2 className="w-6 h-6 text-chart-2" data-testid="icon-selected-medical" />
                )}
              </div>
              <CardTitle className="text-2xl">Medical</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Master medical entrance exams with in-depth Biology, Chemistry, and Physics preparation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-chart-2" />
                  <span>Advanced Biology</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-chart-2" />
                  <span>Organic Chemistry</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-chart-2" />
                  <span>Physics Fundamentals</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button
            size="lg"
            disabled={!selectedStream || createProfileMutation.isPending}
            onClick={handleSubmit}
            className="min-w-48"
            data-testid="button-continue"
          >
            {createProfileMutation.isPending ? "Creating Profile..." : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}

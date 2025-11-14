import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";

export function useAdminAuth() {
  const [, setLocation] = useLocation();
  
  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/check"],
    queryFn: async () => {
      const response = await fetch("/api/admin/check", {
        credentials: "include",
      });
      if (!response.ok) {
        return { isAdmin: false };
      }
      return await response.json();
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (!isLoading && !data?.isAdmin) {
      setLocation("/admin/login");
    }
  }, [data, isLoading, setLocation]);

  return {
    isAdmin: data?.isAdmin || false,
    username: data?.username,
    isLoading,
  };
}

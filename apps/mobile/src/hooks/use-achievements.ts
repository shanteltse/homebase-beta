import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

interface Achievement {
  id: string;
  type: string;
  unlockedAt: string;
}

export function useAchievements() {
  return useQuery({
    queryKey: ["achievements"],
    queryFn: () => api<Achievement[]>("/api/achievements"),
  });
}

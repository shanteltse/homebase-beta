import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

interface Household {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: string;
}

interface HouseholdMember {
  id: string;
  userId: string;
  role: "owner" | "member";
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

export function useHousehold() {
  return useQuery({
    queryKey: ["household"],
    queryFn: () => api<Household[]>("/api/households"),
  });
}

export function useHouseholdMembers() {
  return useQuery({
    queryKey: ["household-members"],
    queryFn: () => api<HouseholdMember[]>("/api/households/members"),
  });
}

export function useCreateHousehold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api<Household>("/api/households", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["household"] });
    },
  });
}

export function useJoinHousehold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inviteCode: string) =>
      api<void>("/api/households/join", {
        method: "POST",
        body: JSON.stringify({ inviteCode }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["household"] });
    },
  });
}

export function useLeaveHousehold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api<void>("/api/households/leave", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["household"] });
    },
  });
}

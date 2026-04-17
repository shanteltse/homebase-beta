import { useQuery } from "@tanstack/react-query";

export type HouseholdMember = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: "owner" | "member";
  joinedAt: string;
  avatarColor: string | null;
  useGooglePhoto: boolean;
};

async function fetchMembers(): Promise<HouseholdMember[]> {
  const res = await fetch("/api/households/members");
  if (!res.ok) throw new Error("Failed to fetch members");
  return res.json();
}

export function useHouseholdMembers() {
  return useQuery({
    queryKey: ["household-members"],
    queryFn: fetchMembers,
  });
}

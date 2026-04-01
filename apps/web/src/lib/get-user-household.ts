import { db } from "@/db";
import { householdMembers } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Returns the household ID of the given user, or null if they are not in a household.
 */
export async function getUserHouseholdId(userId: string): Promise<string | null> {
  const [membership] = await db
    .select({ householdId: householdMembers.householdId })
    .from(householdMembers)
    .where(eq(householdMembers.userId, userId))
    .limit(1);
  return membership?.householdId ?? null;
}

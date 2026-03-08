import { z } from "zod/v4";

export const categorySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  color: z.string(),
  icon: z.string().optional(),
  subcategories: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().min(1),
      }),
    )
    .default([]),
  isDefault: z.boolean().default(false),
});
export type Category = z.infer<typeof categorySchema>;

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "family-home",
    name: "Family & Home",
    color: "#b08068",
    subcategories: [
      { id: "meal-planning", name: "Meal Planning & Groceries" },
      { id: "household-chores", name: "Household Chores" },
      { id: "home-maintenance", name: "Home Maintenance" },
      { id: "family-activities", name: "Family Activities" },
    ],
    isDefault: true,
  },
  {
    id: "personal",
    name: "Personal",
    color: "#7c9a8e",
    subcategories: [
      { id: "health-fitness", name: "Health & Fitness" },
      { id: "finances", name: "Finances" },
      { id: "self-care", name: "Self Care" },
      { id: "errands", name: "Errands" },
    ],
    isDefault: true,
  },
  {
    id: "work-career",
    name: "Work & Career",
    color: "#8b7bb4",
    subcategories: [
      { id: "work-tasks", name: "Work Tasks" },
      { id: "meetings", name: "Meetings" },
      { id: "professional-dev", name: "Professional Development" },
      { id: "projects", name: "Projects" },
    ],
    isDefault: true,
  },
];

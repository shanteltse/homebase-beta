export type AchievementDef = {
  id: string;
  name: string;
  description: string;
  icon: string;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first_task",
    name: "First Step",
    description: "Complete your first task",
    icon: "\uD83C\uDFAF",
  },
  {
    id: "tasks_10",
    name: "Getting Things Done",
    description: "Complete 10 tasks",
    icon: "\u2705",
  },
  {
    id: "tasks_50",
    name: "Productivity Pro",
    description: "Complete 50 tasks",
    icon: "\uD83C\uDFC6",
  },
  {
    id: "tasks_100",
    name: "Century Club",
    description: "Complete 100 tasks",
    icon: "\uD83D\uDCAF",
  },
  {
    id: "streak_3",
    name: "Hat Trick",
    description: "Complete tasks 3 days in a row",
    icon: "\uD83D\uDD25",
  },
  {
    id: "streak_7",
    name: "On Fire",
    description: "Complete tasks 7 days in a row",
    icon: "\uD83D\uDD25",
  },
  {
    id: "streak_30",
    name: "Unstoppable",
    description: "Complete tasks 30 days in a row",
    icon: "\u26A1",
  },
  {
    id: "early_bird",
    name: "Early Bird",
    description: "Complete a task before 8am",
    icon: "\uD83C\uDF05",
  },
  {
    id: "night_owl",
    name: "Night Owl",
    description: "Complete a task after 10pm",
    icon: "\uD83E\uDD89",
  },
  {
    id: "all_categories",
    name: "Well Rounded",
    description: "Complete tasks in all 3 categories",
    icon: "\uD83C\uDF08",
  },
];

export const ACHIEVEMENT_MAP = new Map(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);

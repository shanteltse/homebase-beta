"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { Plus, Trash2, ChevronRight, ChevronLeft, Check, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { useQueryClient } from "@tanstack/react-query";

type Member = {
  name: string;
  email: string;
  relationship: "partner" | "child" | "roommate" | "other";
};

type WizardState = {
  name: string;
  members: Member[];
  notificationDailyRecap: boolean;
  notificationRecapTime: string;
  notificationMorningSummary: boolean;
  notificationTaskReminders: boolean;
  selections: string[];
};

const DISPLAY_STEPS = 5; // steps 2-6 shown in progress bar (step 1 is welcome)

const MANAGE_CATEGORIES = [
  {
    group: "Family & Home",
    items: [
      { id: "kids-activities", label: "Kids' activities & school" },
      { id: "meal-planning", label: "Meal planning & groceries" },
      { id: "household-chores", label: "Household chores" },
      { id: "home-maintenance", label: "Home maintenance" },
      { id: "family-events", label: "Family events" },
      { id: "pet-care", label: "Pet care" },
    ],
  },
  {
    group: "Personal",
    items: [
      { id: "health-fitness", label: "Health & fitness" },
      { id: "medical-appointments", label: "Medical appointments" },
      { id: "personal-finances", label: "Personal finances" },
      { id: "self-care", label: "Self-care" },
      { id: "travel-planning", label: "Travel planning" },
    ],
  },
];

async function saveProgress(step: number) {
  await fetch("/api/user/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ onboardingStep: step }),
  });
}

export function OnboardingWizard({
  userName,
  userEmail,
  initialStep = 1,
}: {
  userName: string;
  userEmail: string;
  initialStep?: number;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  // Clamp initial step to valid range 1-6
  const startStep = Math.min(Math.max(initialStep, 1), 6);
  const [step, setStep] = useState(startStep);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [state, setState] = useState<WizardState>({
    name: userName,
    members: [],
    notificationDailyRecap: true,
    notificationRecapTime: "08:00",
    notificationMorningSummary: true,
    notificationTaskReminders: true,
    selections: [],
  });

  const goTo = useCallback(
    async (nextStep: number) => {
      await saveProgress(nextStep);
      setStep(nextStep);
    },
    [],
  );

  async function handleExit() {
    // Save current progress so user can resume
    await saveProgress(step);
    queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    router.push("/dashboard");
  }

  function addMember() {
    if (state.members.length >= 10) return;
    setState((s) => ({
      ...s,
      members: [...s.members, { name: "", email: "", relationship: "other" }],
    }));
  }

  function removeMember(idx: number) {
    setState((s) => ({
      ...s,
      members: s.members.filter((_, i) => i !== idx),
    }));
  }

  function updateMember(idx: number, field: keyof Member, value: string) {
    setState((s) => ({
      ...s,
      members: s.members.map((m, i) => (i === idx ? { ...m, [field]: value } : m)),
    }));
  }

  function toggleSelection(id: string) {
    setState((s) => ({
      ...s,
      selections: s.selections.includes(id)
        ? s.selections.filter((x) => x !== id)
        : [...s.selections, id],
    }));
  }

  async function handleComplete() {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.name,
          members: state.members.filter((m) => m.name.trim()),
          selections: state.selections,
          notificationDailyRecap: state.notificationDailyRecap,
          notificationRecapTime: state.notificationRecapTime,
          notificationMorningSummary: state.notificationMorningSummary,
          notificationTaskReminders: state.notificationTaskReminders,
        }),
      });

      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["user-profile"] });
        router.replace("/dashboard");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  // Progress bar: steps 2-6 map to 1-5 display positions
  const progressStep = Math.max(step - 1, 0);
  const progressPct = step === 1 ? 0 : ((progressStep - 1) / (DISPLAY_STEPS - 1)) * 100;

  return (
    <div className="w-full max-w-lg">
      {/* Progress + exit row */}
      <div className="mb-6 flex items-center gap-3">
        {step > 1 && step < 6 ? (
          <>
            <div className="flex-1">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Step {progressStep} of {DISPLAY_STEPS}
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.round(progressPct)}%
                </p>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleExit}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Save progress and exit"
            >
              <X className="h-3.5 w-3.5" />
              Exit
            </button>
          </>
        ) : (
          <div className="flex-1" />
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="text-5xl">🏡</div>
            <div className="flex flex-col gap-2">
              <h1 className="heading-md text-foreground">Welcome to HomeBase!</h1>
              <p className="body text-muted-foreground">
                Let&apos;s set up your household in just a few minutes.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2">
              <Button
                variant="primary"
                className="w-full gap-2"
                onClick={() => goTo(2)}
              >
                Get Started <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={handleExit}
              >
                Skip for Now
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Your Information */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="heading-sm text-foreground">Tell us about you</h2>
              <p className="body text-muted-foreground mt-1">
                Your name and email.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="label text-foreground">Your name</label>
                <Input
                  value={state.name}
                  onChange={(e) =>
                    setState((s) => ({ ...s, name: e.target.value }))
                  }
                  placeholder="Enter your name"
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="label text-muted-foreground">Email</label>
                <Input value={userEmail} disabled className="opacity-60" />
              </div>
            </div>
            <StepNav
              onBack={() => goTo(1)}
              onNext={() => goTo(3)}
              canNext={state.name.trim().length > 0}
            />
          </div>
        )}

        {/* Step 3: Household Members */}
        {step === 3 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="heading-sm text-foreground">
                Who else is in your household?
              </h2>
              <p className="body text-muted-foreground mt-1">
                Add family members or roommates (optional).
              </p>
            </div>

            <div className="flex flex-col gap-3 max-h-72 overflow-y-auto">
              {state.members.map((member, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-border p-3 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="label text-muted-foreground">Person {idx + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeMember(idx)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <Input
                    placeholder="Name (required)"
                    value={member.name}
                    onChange={(e) => updateMember(idx, "name", e.target.value)}
                  />
                  <Input
                    placeholder="Email (optional, for invite)"
                    type="email"
                    value={member.email}
                    onChange={(e) => updateMember(idx, "email", e.target.value)}
                  />
                  <select
                    value={member.relationship}
                    onChange={(e) =>
                      updateMember(
                        idx,
                        "relationship",
                        e.target.value as Member["relationship"],
                      )
                    }
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="partner">Partner</option>
                    <option value="child">Child</option>
                    <option value="roommate">Roommate</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              ))}

              {state.members.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No members added yet — you can always add them later in Settings.
                </p>
              )}
            </div>

            {state.members.length < 10 && (
              <button
                type="button"
                onClick={addMember}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Plus className="h-4 w-4" /> Add a person
              </button>
            )}

            <StepNav
              onBack={() => goTo(2)}
              onNext={() => goTo(4)}
              canNext
              skipLabel="Skip"
              onSkip={() => goTo(4)}
            />
          </div>
        )}

        {/* Step 4: Notification Preferences */}
        {step === 4 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="heading-sm text-foreground">
                How should we keep you updated?
              </h2>
              <p className="body text-muted-foreground mt-1">
                Adjust anytime in Settings.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.notificationDailyRecap}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      notificationDailyRecap: e.target.checked,
                    }))
                  }
                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                />
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-foreground">
                    Daily recap email
                  </p>
                  <p className="text-xs text-muted-foreground">
                    A summary of your tasks each day
                  </p>
                </div>
              </label>

              {state.notificationDailyRecap && (
                <div className="ml-7 flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">Send at</p>
                  <input
                    type="time"
                    value={state.notificationRecapTime}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        notificationRecapTime: e.target.value,
                      }))
                    }
                    className="rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground"
                  />
                </div>
              )}

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.notificationMorningSummary}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      notificationMorningSummary: e.target.checked,
                    }))
                  }
                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                />
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-foreground">
                    Morning summary
                  </p>
                  <p className="text-xs text-muted-foreground">
                    See what&apos;s on your plate for the day
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={state.notificationTaskReminders}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      notificationTaskReminders: e.target.checked,
                    }))
                  }
                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                />
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-foreground">
                    Task reminders
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Get reminded about upcoming due dates
                  </p>
                </div>
              </label>
            </div>

            <StepNav
              onBack={() => goTo(3)}
              onNext={() => goTo(5)}
              canNext
              skipLabel="Skip"
              onSkip={() => goTo(5)}
            />
          </div>
        )}

        {/* Step 5: What Do You Manage */}
        {step === 5 && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="heading-sm text-foreground">
                What do you need help managing?
              </h2>
              <p className="body text-muted-foreground mt-1">
                We&apos;ll create a few starter tasks to get you going.
              </p>
            </div>

            <div className="flex flex-col gap-5 max-h-72 overflow-y-auto pr-1">
              {MANAGE_CATEGORIES.map((group) => (
                <div key={group.group} className="flex flex-col gap-2">
                  <p className="label text-muted-foreground uppercase tracking-wide text-xs">
                    {group.group}
                  </p>
                  {group.items.map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={state.selections.includes(item.id)}
                        onChange={() => toggleSelection(item.id)}
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                      <p className="text-sm text-foreground">{item.label}</p>
                    </label>
                  ))}
                </div>
              ))}
            </div>

            <StepNav
              onBack={() => goTo(4)}
              onNext={() => goTo(6)}
              canNext
              skipLabel="Skip"
              onSkip={() => goTo(6)}
            />
          </div>
        )}

        {/* Step 6: All Set */}
        {step === 6 && (
          <div className="flex flex-col items-center gap-6 text-center">
            <div className="text-5xl">🎉</div>
            <div className="flex flex-col gap-2">
              <h2 className="heading-md text-foreground">You&apos;re all set!</h2>
              <p className="body text-muted-foreground">
                Here are a few tips to get started.
              </p>
            </div>

            <div className="w-full rounded-xl bg-muted/50 border border-border p-4 text-left flex flex-col gap-3">
              {[
                {
                  icon: "✨",
                  tip: 'Add tasks quickly with the "Smart Add" box or voice input',
                },
                {
                  icon: "💆",
                  tip: 'Try "Me Moments" tasks for personal self-care',
                },
                {
                  icon: "📅",
                  tip: "Sync with Google Calendar in Settings",
                },
              ].map(({ icon, tip }) => (
                <div key={tip} className="flex items-start gap-3">
                  <span className="text-lg leading-none mt-0.5">{icon}</span>
                  <p className="text-sm text-foreground">{tip}</p>
                </div>
              ))}
            </div>

            <div className="w-full flex flex-col gap-2">
              <Button
                variant="primary"
                className="w-full gap-2"
                onClick={handleComplete}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Setting things up..." : "Start Using HomeBase"}
                {!isSubmitting && <Check className="h-4 w-4" />}
              </Button>
              <button
                type="button"
                onClick={() => goTo(5)}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
              >
                <ChevronLeft className="h-3 w-3" /> Go back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepNav({
  onBack,
  onNext,
  canNext = true,
  skipLabel,
  onSkip,
}: {
  onBack: () => void;
  onNext: () => void;
  canNext?: boolean;
  skipLabel?: string;
  onSkip?: () => void;
}) {
  return (
    <div className="flex items-center justify-between pt-2 border-t border-border">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-center gap-2">
        {skipLabel && onSkip && (
          <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
            {skipLabel}
          </Button>
        )}
        <Button
          variant="primary"
          size="sm"
          onClick={onNext}
          disabled={!canNext}
          className="gap-1"
        >
          Continue <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

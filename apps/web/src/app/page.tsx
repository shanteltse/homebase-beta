import { LinkButton } from "@repo/ui/link-button";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="mx-auto flex max-w-md flex-col items-center gap-8 text-center">
        <div className="flex flex-col gap-3">
          <h1 className="heading-xl text-foreground">HomeBase</h1>
          <p className="body-lg text-muted-foreground">
            Your personal command center for home and family life.
          </p>
        </div>
        <div className="flex gap-4">
          <LinkButton href="/login" size="lg">
            Log in
          </LinkButton>
          <LinkButton href="/register" variant="outline" size="lg">
            Sign up
          </LinkButton>
        </div>
      </div>
    </div>
  );
}

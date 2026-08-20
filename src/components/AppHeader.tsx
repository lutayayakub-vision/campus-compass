import { Link, useNavigate } from "@tanstack/react-router";
import { Compass, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export function AppHeader({ subtitle }: { subtitle?: string | undefined }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-[1000] flex items-center gap-3 border-b bg-card px-4 py-3">
      <Link to="/" className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary">
        <Compass className="size-5 text-primary-foreground" />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold leading-tight">Fresher Finder</p>
        <p className="truncate text-xs text-muted-foreground">
          {subtitle ?? profile?.full_name ?? "Makerere University"}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Sign out"
        onClick={async () => {
          await signOut();
          void navigate({ to: "/" });
        }}
      >
        <LogOut className="size-4" />
      </Button>
    </header>
  );
}

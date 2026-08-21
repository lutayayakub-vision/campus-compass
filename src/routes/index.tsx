import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Compass, MessageSquare, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { classesQuery } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fresher Finder — Find lost freshers at Makerere" },
      {
        name: "description",
        content:
          "Sign in as a class rep or fresher to share live location, see Makerere lecture buildings on a map and chat 1-on-1.",
      },
      { property: "og:title", content: "Fresher Finder — Makerere University" },
      {
        property: "og:description",
        content:
          "Live campus map, location sharing and 1-on-1 chat so class reps can guide lost freshers to their lecture buildings.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (recovery || loading || !user || !profile) return;
    if (!profile.class_id) {
      void navigate({ to: "/onboarding" });
      return;
    }
    void navigate({ to: profile.role === "rep" ? "/rep" : "/fresher" });
  }, [recovery, loading, user, profile, navigate]);

  useEffect(() => {
    if (recovery) return;
    if (!loading && user && !profile) void navigate({ to: "/onboarding" });
  }, [recovery, loading, user, profile, navigate]);

  if (recovery) {
    return (
      <UpdatePasswordForm
        onDone={() => {
          setRecovery(false);
          void navigate({ to: "/" });
        }}
      />
    );
  }

  if (loading || user) {
    return (
      <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </main>
    );
  }

  return <AuthScreen />;
}

function AuthScreen() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-10">
        <header className="text-center">
          <div className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Compass className="size-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Fresher Finder</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Makerere University · helping class reps reach lost freshers fast
          </p>
        </header>

        <ul className="grid grid-cols-3 gap-2 text-center text-[11px] text-muted-foreground">
          <li className="panel px-2 py-3">
            <MapPin className="mx-auto mb-1 size-4 text-accent" />
            Live location
          </li>
          <li className="panel px-2 py-3">
            <Compass className="mx-auto mb-1 size-4 text-accent" />
            Building pins
          </li>
          <li className="panel px-2 py-3">
            <MessageSquare className="mx-auto mb-1 size-4 text-accent" />
            1-on-1 chat
          </li>
        </ul>

        <div className="panel p-5">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="pt-4">
              <SignInForm />
            </TabsContent>
            <TabsContent value="signup" className="pt-4">
              <SignUpForm />
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </main>
  );
}

function PasswordField({
  id,
  value,
  onChange,
  autoComplete,
  minLength,
}: {
  id: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete: string;
  minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        required
        minLength={minLength}
        value={value}
        onChange={onChange}
        className="pr-9"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:bg-transparent"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </Button>
    </div>
  );
}

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
  }

  if (forgot) return <ForgotPasswordForm onBack={() => setForgot(false)} />;

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="si-email">Email</Label>
        <Input
          id="si-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="si-pass">Password</Label>
          <button
            type="button"
            onClick={() => setForgot(true)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Forgot password?
          </button>
        </div>
        <PasswordField
          id="si-pass"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={busy} className="mt-1 w-full">
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <div className="grid gap-1">
        <h2 className="text-base font-semibold">Reset your password</h2>
        <p className="text-sm text-muted-foreground">
          {sent
            ? `Reset link sent to ${email}. Check your inbox.`
            : "Enter your email and we'll send you a link to reset your password."}
        </p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="fp-email">Email</Label>
        <Input
          id="fp-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={sent}
        />
      </div>
      <Button type="submit" disabled={busy || sent} className="w-full">
        {busy ? "Sending…" : "Send reset link"}
      </Button>
      <button
        type="button"
        onClick={onBack}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        Back to sign in
      </button>
    </form>
  );
}

function UpdatePasswordForm({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated. Please sign in.");
    await supabase.auth.signOut();
    onDone();
  }

  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex w-full max-w-md flex-col gap-6 px-5 py-10">
        <header className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Set a new password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a new password for your account.
          </p>
        </header>
        <form onSubmit={onSubmit} className="panel grid gap-3 p-5">
          <div className="grid gap-1.5">
            <Label htmlFor="up-pass">New password</Label>
            <div className="relative">
              <Input
                id="up-pass"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-9"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-9 w-9 text-muted-foreground hover:bg-transparent"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="up-confirm">Confirm password</Label>
            <Input
              id="up-confirm"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Updating…" : "Update password"}
          </Button>
        </form>
      </section>
    </main>
  );
}

function SignUpForm() {
  const { data: classes } = useQuery(classesQuery);
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"fresher" | "rep">("fresher");
  const [classId, setClassId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!classId) {
      toast.error("Pick your class first.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name, role, class_id: classId },
      },
    });
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    if (data.user && data.session) {
      const { error: pErr } = await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: name,
        role,
        class_id: classId,
      });
      setBusy(false);
      if (pErr) {
        toast.error(pErr.message);
        return;
      }
      await refreshProfile();
      void navigate({ to: role === "rep" ? "/rep" : "/fresher" });
      return;
    }
    setBusy(false);
    toast.success("Check your email to confirm your account, then sign in.");
  }


  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="su-name">Full name</Label>
        <Input
          id="su-name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nakato Sarah"
        />
      </div>
      <div className="grid gap-1.5">
        <Label>I am a…</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={role === "fresher" ? "default" : "outline"}
            onClick={() => setRole("fresher")}
          >
            Fresher
          </Button>
          <Button
            type="button"
            variant={role === "rep" ? "default" : "outline"}
            onClick={() => setRole("rep")}
          >
            Class rep
          </Button>
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label>Class / course</Label>
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger>
            <SelectValue placeholder="Select your class" />
          </SelectTrigger>
          <SelectContent>
            {(classes ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} ({c.code})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="su-email">Email</Label>
        <Input
          id="su-email"
          type="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="su-pass">Password</Label>
        <PasswordField
          id="su-pass"
          autoComplete="new-password"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={busy} className="mt-1 w-full">
        {busy ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}

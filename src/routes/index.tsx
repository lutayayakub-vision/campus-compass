import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Compass, MessageSquare } from "lucide-react";
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

  useEffect(() => {
    if (loading || !user || !profile) return;
    if (!profile.class_id) {
      void navigate({ to: "/onboarding" });
      return;
    }
    void navigate({ to: profile.role === "rep" ? "/rep" : "/fresher" });
  }, [loading, user, profile, navigate]);

  useEffect(() => {
    if (!loading && user && !profile) void navigate({ to: "/onboarding" });
  }, [loading, user, profile, navigate]);

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

function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
  }

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
        <Label htmlFor="si-pass">Password</Label>
        <Input
          id="si-pass"
          type="password"
          autoComplete="current-password"
          required
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
        <Input
          id="su-pass"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
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

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Choose your class — Fresher Finder" },
      {
        name: "description",
        content: "Pick your Makerere class or course so your class rep can find you.",
      },
      { property: "og:title", content: "Choose your class — Fresher Finder" },
      {
        property: "og:description",
        content: "Pick your Makerere class or course so your class rep can find you.",
      },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { data: classes } = useQuery(classesQuery);
  const [name, setName] = useState("");
  const [role, setRole] = useState<"fresher" | "rep">("fresher");
  const [classId, setClassId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile?.class_id) {
      void navigate({ to: profile.role === "rep" ? "/rep" : "/fresher" });
    }
    if (profile?.full_name) setName(profile.full_name);
  }, [profile, navigate]);

  useEffect(() => {
    const meta = user?.user_metadata as
      | { full_name?: string; role?: "rep" | "fresher"; class_id?: string }
      | undefined;
    if (meta?.full_name) setName((n) => n || meta.full_name!);
    if (meta?.role) setRole(meta.role);
    if (meta?.class_id) setClassId((c) => c || meta.class_id!);
  }, [user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !classId) {
      toast.error("Pick your class first.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, full_name: name, role, class_id: classId });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshProfile();
    void navigate({ to: role === "rep" ? "/rep" : "/fresher" });
  }

  return (
    <main className="mx-auto w-full max-w-md px-5 py-10">
      <h1 className="text-xl font-bold">Set up your profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your class links you to your rep and classmates.
      </p>
      <form onSubmit={save} className="panel mt-5 grid gap-3 p-5">
        <div className="grid gap-1.5">
          <Label htmlFor="ob-name">Full name</Label>
          <Input
            id="ob-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
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
        <Button type="submit" disabled={busy} className="mt-1">
          {busy ? "Saving…" : "Continue"}
        </Button>
      </form>
    </main>
  );
}

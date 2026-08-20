import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/chat/$peerId")({
  head: () => ({
    meta: [
      { title: "Chat — Fresher Finder" },
      {
        name: "description",
        content:
          "Private 1-on-1 chat between a Makerere class rep and a fresher who needs directions.",
      },
      { property: "og:title", content: "Chat — Fresher Finder" },
      {
        property: "og:description",
        content: "Private 1-on-1 chat between a class rep and a fresher.",
      },
    ],
  }),
  component: ChatPage,
});

type Message = Tables<"messages">;

const QUICK = ["I'm 2 minutes away", "Stay where you are", "Walk towards Freedom Square"];

function ChatPage() {
  const { peerId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [peerName, setPeerName] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/" });
  }, [loading, user, navigate]);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", peerId)
      .maybeSingle()
      .then(({ data }) => setPeerName(data?.full_name ?? "Chat"));
  }, [peerId]);

  useEffect(() => {
    if (!user) return;
    let active = true;

    async function load() {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user!.id},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${user!.id})`,
        )
        .order("created_at", { ascending: true });
      if (error) {
        toast.error(error.message);
        return;
      }
      if (active) setMessages(data ?? []);
    }
    void load();

    const channel = supabase
      .channel(`chat-${[user.id, peerId].sort().join("-")}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Message;
          const mine =
            (m.sender_id === user.id && m.recipient_id === peerId) ||
            (m.sender_id === peerId && m.recipient_id === user.id);
          if (!mine) return;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        },
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [user, peerId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(body: string) {
    const value = body.trim();
    if (!value || !user) return;
    setSending(true);
    const { data, error } = await supabase
      .from("messages")
      .insert({ sender_id: user.id, recipient_id: peerId, body: value })
      .select()
      .single();
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setText("");
    if (data) setMessages((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data]));
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex items-center gap-2 border-b bg-card px-3 py-3">
        <Button asChild variant="ghost" size="icon" aria-label="Back">
          <Link to="/">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <p className="truncate font-semibold">{peerName}</p>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <p className="pt-8 text-center text-sm text-muted-foreground">
            No messages yet. Say where you are.
          </p>
        ) : null}
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm ${
                  mine
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {m.body}
                <span
                  className={`mt-1 block text-[10px] ${mine ? "opacity-70" : "text-muted-foreground"}`}
                >
                  {new Date(m.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2 overflow-x-auto border-t bg-card px-3 pt-2">
        {QUICK.map((q) => (
          <Button
            key={q}
            size="sm"
            variant="outline"
            className="shrink-0 text-xs"
            onClick={() => void send(q)}
          >
            {q}
          </Button>
        ))}
      </div>

      <form
        className="flex gap-2 bg-card px-3 pb-4 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(text);
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          aria-label="Message"
        />
        <Button type="submit" size="icon" disabled={sending} aria-label="Send">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}

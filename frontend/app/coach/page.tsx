"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";
import { useShell } from "@/components/ui/Shell";
import { RightPanel, PanelSection } from "@/components/ui/RightPanel";
import {
  api,
  type ChatMessage,
  type CoachInsight,
  type Conversation,
} from "@/lib/api";

const SUGGESTIONS: { label: string; items: string[] }[] = [
  {
    label: "Diagnose",
    items: [
      "How am I doing overall?",
      "Which concepts am I struggling with most?",
      "Compare retention across my tracks.",
    ],
  },
  {
    label: "Plan",
    items: [
      "What should I focus on this week?",
      "Am I behind on the Striver A2Z roadmap?",
      "Give me today's first 30-minute plan.",
    ],
  },
  {
    label: "Deep dive",
    items: [
      "Walk me through my DSA progress in detail.",
      "Am I retaining AI math well?",
      "Which system-design materials feel weakest?",
    ],
  },
];

type ConvSummary = {
  id: string;
  title: string;
  updated_at: string;
  message_count: number;
};

export default function CoachPage() {
  const { setRightPanel } = useShell();
  const [aiStatus, setAIStatus] = useState<{ enabled: boolean; provider: string; model: string } | null>(null);
  const [conversations, setConversations] = useState<ConvSummary[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekly, setWeekly] = useState<CoachInsight | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    setConversations(await api.listConversations());
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [status, convs] = await Promise.all([
          api.getAIStatus(),
          api.listConversations(),
        ]);
        setAIStatus(status);
        setConversations(convs);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .getWeeklyInsight()
      .then((w) => !cancelled && setWeekly(w))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshWeekly = useCallback(async () => {
    setWeeklyLoading(true);
    try {
      const w = await api.getWeeklyInsight(true);
      setWeekly(w);
    } finally {
      setWeeklyLoading(false);
    }
  }, []);

  useEffect(() => {
    if (messagesRef.current) messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
  }, [active?.messages.length, sending]);

  useEffect(() => {
    setRightPanel(
      <RightPanel>
        <PanelSection label="Coach status">
          <div style={{ fontSize: 13, color: "var(--fg-soft)", lineHeight: 1.5 }}>
            {aiStatus?.enabled ? (
              <>
                <strong style={{ color: "var(--fg)" }}>Online</strong>
                <div style={{ fontFamily: "var(--font-mono-stack)", fontSize: 11, color: "var(--fg-mute)", marginTop: 4 }}>
                  {aiStatus.provider} · {aiStatus.model}
                </div>
              </>
            ) : (
              <>
                <strong style={{ color: "var(--fg)" }}>Offline</strong>
                <div style={{ marginTop: 4, color: "var(--fg-mute)" }}>
                  Add an AI API key to your backend{" "}
                  <code style={{ fontFamily: "var(--font-mono-stack)" }}>.env</code>.
                </div>
              </>
            )}
          </div>
        </PanelSection>

        {weekly && weekly.content ? (
          <PanelSection
            label="Weekly postmortem"
            action={
              <button
                type="button"
                className="appbar-icon-btn"
                onClick={refreshWeekly}
                disabled={weeklyLoading || !aiStatus?.enabled}
                title="Regenerate"
              >
                ↺
              </button>
            }
          >
            <div className="weekly-card" style={{ margin: 0, padding: "var(--s-4)" }}>
              <div className="weekly-card-eyebrow">{weekly.period_key}</div>
              <div className="weekly-card-body" style={{ fontSize: 13, marginTop: 8 }}>
                <Markdown>{weekly.content}</Markdown>
              </div>
              <div className="weekly-card-foot">
                {new Date(weekly.generated_at).toLocaleDateString()} · {weekly.model}
              </div>
            </div>
          </PanelSection>
        ) : null}
      </RightPanel>
    );
    return () => setRightPanel(null);
  }, [aiStatus, weekly, weeklyLoading, refreshWeekly, setRightPanel]);

  async function openConversation(id: string) {
    setError(null);
    const conv = await api.getConversation(id);
    setActive(conv);
  }

  async function startNew(prefill?: string) {
    setError(null);
    const conv = await api.createConversation();
    setActive(conv);
    await refresh();
    if (prefill) await send(prefill, conv.id);
  }

  async function send(content: string, convId?: string) {
    const targetId = convId ?? active?.id;
    if (!targetId) {
      await startNew(content);
      return;
    }
    setSending(true);
    setError(null);
    setInput("");

    const optimisticUser: ChatMessage = {
      id: `tmp-${Date.now()}`,
      role: "USER",
      content,
      tool_calls: null,
      tool_results: null,
      created_at: new Date().toISOString(),
    };
    setActive((prev) =>
      prev && prev.id === targetId
        ? { ...prev, messages: [...prev.messages, optimisticUser] }
        : prev
    );

    try {
      await api.sendMessage(targetId, content);
      const fresh = await api.getConversation(targetId);
      setActive(fresh);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
      setActive((prev) =>
        prev && prev.id === targetId
          ? { ...prev, messages: prev.messages.filter((m) => m.id !== optimisticUser.id) }
          : prev
      );
    } finally {
      setSending(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const v = input.trim();
    if (!v || sending) return;
    await send(v);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this conversation?")) return;
    await api.deleteConversation(id);
    if (active?.id === id) setActive(null);
    await refresh();
  }

  if (loading) return <p style={{ color: "var(--fg-mute)" }}>Loading Coach…</p>;

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">Coach</h1>
          <p className="page-sub">Ask anything about your learning. Coach can see your real telemetry.</p>
        </div>
      </header>

      <div className="coach-shell">
        <aside className="coach-sidebar">
          <button
            type="button"
            className="coach-new-btn"
            onClick={() => startNew()}
            disabled={sending}
          >
            + New conversation
          </button>
          {conversations.length === 0 ? (
            <div style={{ color: "var(--fg-mute)", fontSize: 12.5, padding: 8 }}>
              No conversations yet.
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`coach-conv${active?.id === c.id ? " active" : ""}`}
                onClick={() => openConversation(c.id)}
                style={{ background: "transparent", border: "none", textAlign: "left" }}
              >
                <span className="coach-conv-title">{c.title}</span>
                <span className="coach-conv-meta">
                  {new Date(c.updated_at).toLocaleDateString()} · {c.message_count} msg
                </span>
              </button>
            ))
          )}
        </aside>

        <section className="coach-main">
          {!active ? (
            <div className="coach-empty">
              <h2>What would you like to know?</h2>
              <p style={{ maxWidth: 460, margin: "0 auto", color: "var(--fg-mute)", fontSize: 13 }}>
                Pick a starter or write your own. Coach reads stats, struggling cards, and per-track performance live.
              </p>
              <div className="suggestion-grid">
                {SUGGESTIONS.map((g) => (
                  <div key={g.label} className="suggestion-col">
                    <h3>{g.label}</h3>
                    {g.items.map((q) => (
                      <button
                        key={q}
                        type="button"
                        className="suggestion-btn"
                        onClick={() => startNew(q)}
                        disabled={!aiStatus?.enabled}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <header className="coach-chat-head">
                <h2>{active.title}</h2>
                <button
                  type="button"
                  className="v2-btn ghost sm"
                  onClick={() => handleDelete(active.id)}
                >
                  Delete
                </button>
              </header>

              <div className="coach-messages" ref={messagesRef}>
                {active.messages.map((msg) => (
                  <div key={msg.id} className={`coach-msg${msg.role === "USER" ? " user" : ""}`}>
                    <div className="coach-avatar">{msg.role === "USER" ? "You" : "C"}</div>
                    <div className="coach-bubble">
                      {msg.role === "ASSISTANT" &&
                        msg.tool_calls &&
                        msg.tool_calls.length > 0 && (
                          <div className="tool-pills">
                            {msg.tool_calls.map((tc) => (
                              <span key={tc.id} className="tool-pill">
                                {tc.name}
                              </span>
                            ))}
                          </div>
                        )}
                      {msg.content && <Markdown>{msg.content}</Markdown>}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="coach-msg">
                    <div className="coach-avatar">C</div>
                    <div className="coach-bubble">
                      <span className="typing">
                        <span /><span /><span />
                      </span>
                    </div>
                  </div>
                )}
                {error && (
                  <div className="coach-msg">
                    <div className="coach-avatar">!</div>
                    <div className="coach-bubble" style={{ color: "var(--bad)" }}>{error}</div>
                  </div>
                )}
              </div>

              <form className="coach-input" onSubmit={handleSubmit}>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    aiStatus?.enabled ? "Ask about your learning…" : "Set API key to enable Coach"
                  }
                  disabled={sending || !aiStatus?.enabled}
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e as unknown as FormEvent);
                    }
                  }}
                />
                <button
                  type="submit"
                  className="v2-btn primary"
                  disabled={sending || !input.trim() || !aiStatus?.enabled}
                >
                  Send
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </>
  );
}

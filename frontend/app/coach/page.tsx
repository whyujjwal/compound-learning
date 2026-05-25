"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";
import { api, type ChatMessage, type CoachInsight, type Conversation } from "@/lib/api";

const SUGGESTION_GROUPS: { label: string; items: string[] }[] = [
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
      "Am I retaining AI math well? What needs reinforcement?",
      "Which system-design materials are overdue and why?",
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
        const [status, convs] = await Promise.all([api.getAIStatus(), api.listConversations()]);
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
      .then((w) => {
        if (!cancelled) setWeekly(w);
      })
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
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [active?.messages.length, sending]);

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
    if (prefill) {
      await send(prefill, conv.id);
    }
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

    // Optimistic user message
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
      const res = await api.sendMessage(targetId, content);
      const fresh = await api.getConversation(targetId);
      setActive(fresh);
      await refresh();
      void res;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
      // Roll back optimistic
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
    const value = input.trim();
    if (!value || sending) return;
    await send(value);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this conversation?")) return;
    await api.deleteConversation(id);
    if (active?.id === id) setActive(null);
    await refresh();
  }

  if (loading) return <div className="empty">Loading Coach…</div>;

  return (
    <div className="coach-page">
      <header className="roadmap-strip">
        <div className="roadmap-strip-left">
          <h1 className="roadmap-title">Coach</h1>
          <span className="roadmap-summary">
            {aiStatus?.enabled
              ? `${aiStatus.provider} · ${aiStatus.model}`
              : "Offline · add API key in backend .env"}
          </span>
        </div>
      </header>

      {!aiStatus?.enabled && (
        <div className="error-panel">
          <p>
            <strong>Coach is offline.</strong> Add an API key to your backend
            <code style={{ marginLeft: "0.4rem", fontFamily: "var(--mono)" }}>.env</code>:
          </p>
          <pre style={{
            fontFamily: "var(--mono)",
            fontSize: "0.78rem",
            background: "var(--ink-2)",
            padding: "0.85rem",
            borderRadius: "var(--radius)",
            marginTop: "0.75rem",
            color: "var(--text-soft)",
          }}>
ANTHROPIC_API_KEY=sk-ant-...{"\n"}
# or OPENAI_API_KEY=sk-... with AI_PROVIDER=openai
          </pre>
          <p style={{ marginTop: "0.75rem", color: "var(--muted)", fontSize: "0.85rem" }}>
            Then restart the backend. Conversations and message history will work without the AI active.
          </p>
        </div>
      )}

      {weekly && weekly.content && (
        <section className="weekly-card">
          <div className="weekly-card-header">
            <div>
              <div className="weekly-card-eyebrow">This week · {weekly.period_key}</div>
              <h2 className="weekly-card-title">Postmortem</h2>
            </div>
            <button
              type="button"
              className="ghost"
              onClick={refreshWeekly}
              disabled={weeklyLoading || !aiStatus?.enabled}
              title="Regenerate with latest data"
            >
              {weeklyLoading ? "…" : "Refresh"}
            </button>
          </div>
          <div className="weekly-card-body">
            <Markdown>{weekly.content}</Markdown>
          </div>
          <div className="weekly-card-foot">
            generated {new Date(weekly.generated_at).toLocaleString()} · {weekly.model}
          </div>
        </section>
      )}

      <div className="coach-shell">
        <div className="convo-list">
          <button
            onClick={() => startNew()}
            style={{ width: "100%", marginBottom: "0.5rem" }}
            disabled={sending}
          >
            + New conversation
          </button>

          {conversations.length === 0 ? (
            <div className="muted" style={{ fontSize: "0.85rem", padding: "0.5rem" }}>
              No conversations yet.
            </div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                className={`convo-item ${active?.id === c.id ? "active" : ""}`}
                onClick={() => openConversation(c.id)}
              >
                <div className="convo-title">{c.title}</div>
                <div className="convo-meta">
                  {new Date(c.updated_at).toLocaleDateString()} · {c.message_count} msg
                </div>
              </div>
            ))
          )}
        </div>

        <div className="coach-main">
          {!active ? (
            <div className="coach-empty">
              <h3>What would you like to know?</h3>
              <p>
                The Coach can see your real telemetry — reviews, retention, streak,
                struggling cards, and per-track performance. Pick a prompt or write your own.
              </p>
              <div className="suggestion-groups">
                {SUGGESTION_GROUPS.map((g) => (
                  <div key={g.label} className="suggestion-group">
                    <div className="suggestion-group-label">{g.label}</div>
                    <div className="suggested-questions">
                      {g.items.map((q) => (
                        <button
                          key={q}
                          className="suggested-q"
                          onClick={() => startNew(q)}
                          disabled={!aiStatus?.enabled}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="coach-header">
                <h2>{active.title}</h2>
                <button className="ghost" onClick={() => handleDelete(active.id)}>Delete</button>
              </div>

              <div className="coach-messages" ref={messagesRef}>
                {active.messages.map((msg) => (
                  <div key={msg.id} className={`message ${msg.role === "USER" ? "user" : ""}`}>
                    <div className="message-avatar">
                      {msg.role === "USER" ? "You" : "C"}
                    </div>
                    <div className="message-bubble">
                      {msg.role === "ASSISTANT" && msg.tool_calls && msg.tool_calls.length > 0 && (
                        <div className="tool-calls">
                          {msg.tool_calls.map((tc) => (
                            <span key={tc.id} className="tool-call-pill">
                              {tc.name}
                              {Object.keys(tc.input).length > 0 && (
                                <span style={{ opacity: 0.7 }}>
                                  ({Object.entries(tc.input).map(([k, v]) => `${k}=${v}`).join(", ")})
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                      {msg.content && <Markdown>{msg.content}</Markdown>}
                    </div>
                  </div>
                ))}

                {sending && (
                  <div className="message">
                    <div className="message-avatar">C</div>
                    <div className="message-bubble">
                      <div className="typing">
                        <span></span><span></span><span></span>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="error-panel">
                    <p>{error}</p>
                  </div>
                )}
              </div>

              <div className="coach-input-wrap">
                <form className="coach-input" onSubmit={handleSubmit}>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={aiStatus?.enabled ? "Ask about your learning…" : "Set API key to enable Coach"}
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
                    className="primary"
                    type="submit"
                    disabled={sending || !input.trim() || !aiStatus?.enabled}
                    style={{ alignSelf: "stretch", padding: "0 1.25rem" }}
                  >
                    Send
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

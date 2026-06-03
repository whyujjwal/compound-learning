"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/Markdown";
import { api, type ChatMessage, type CoachInsight, type Conversation } from "@/lib/api";

const QUICK_PROMPTS = [
  "How am I doing overall?",
  "Which concepts am I struggling with most?",
  "What should I focus on this week?",
  "Give me today's first 30-minute plan.",
];

export function HomeCoach() {
  const [aiStatus, setAIStatus] = useState<{ enabled: boolean; provider: string; model: string } | null>(null);
  const [active, setActive] = useState<Conversation | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nudge, setNudge] = useState<CoachInsight | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const status = await api.getAIStatus();
        setAIStatus(status);
      } catch {
        // tolerate failure
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .getDailyInsight()
      .then((n) => !cancelled && setNudge(n))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [active?.messages.length, sending]);

  async function startNew(prefill?: string) {
    setError(null);
    const conv = await api.createConversation();
    setActive(conv);
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

    const optimistic: ChatMessage = {
      id: `tmp-${Date.now()}`,
      role: "USER",
      content,
      tool_calls: null,
      tool_results: null,
      created_at: new Date().toISOString(),
    };
    setActive((prev) =>
      prev && prev.id === targetId
        ? { ...prev, messages: [...prev.messages, optimistic] }
        : prev
    );

    try {
      await api.sendMessage(targetId, content);
      const fresh = await api.getConversation(targetId);
      setActive(fresh);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
      setActive((prev) =>
        prev && prev.id === targetId
          ? { ...prev, messages: prev.messages.filter((m) => m.id !== optimistic.id) }
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

  const resetConversation = useCallback(() => {
    setActive(null);
    setError(null);
    setInput("");
  }, []);

  if (loading) {
    return (
      <section className="home-coach">
        <div className="home-coach-head">
          <div>
            <h2 className="home-coach-title">Coach</h2>
          </div>
        </div>
        <p className="home-coach-loading">Loading…</p>
      </section>
    );
  }

  const coachDisabled = !aiStatus?.enabled;

  return (
    <section className="home-coach">
      <div className="home-coach-head">
        <div>
          <h2 className="home-coach-title">Coach</h2>
          <p className="home-coach-sub">
            Ask anything — Coach reads your real stats, tracks, and retention data.
          </p>
        </div>
        {active && (
          <button
            type="button"
            className="v2-btn ghost sm"
            onClick={resetConversation}
          >
            New conversation
          </button>
        )}
      </div>

      {nudge?.content && !active && (
        <div className="home-coach-nudge">
          <span className="home-coach-nudge-label">Today&apos;s insight</span>
          <p>{nudge.content}</p>
        </div>
      )}

      {coachDisabled && (
        <div className="home-coach-offline">
          Coach is offline. Add an AI API key to your backend{" "}
          <code>.env</code> to enable it.
        </div>
      )}

      {!active ? (
        <div className="home-coach-prompts">
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              type="button"
              className="suggestion-btn"
              onClick={() => startNew(q)}
              disabled={coachDisabled}
            >
              {q}
            </button>
          ))}
        </div>
      ) : (
        <div className="home-coach-messages" ref={messagesRef}>
          {active.messages.map((msg) => (
            <div key={msg.id} className={`coach-msg${msg.role === "USER" ? " user" : ""}`}>
              <div className="coach-avatar">{msg.role === "USER" ? "You" : "C"}</div>
              <div className="coach-bubble">
                {msg.role === "ASSISTANT" &&
                  msg.tool_calls &&
                  msg.tool_calls.length > 0 && (
                    <div className="tool-pills">
                      {msg.tool_calls.map((tc) => (
                        <span key={tc.id} className="tool-pill">{tc.name}</span>
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
                <span className="typing"><span /><span /><span /></span>
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
      )}

      <form className="coach-input" onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={coachDisabled ? "Set API key to enable Coach" : "Ask about your learning…"}
          disabled={sending || coachDisabled}
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
          disabled={sending || !input.trim() || coachDisabled}
        >
          Send
        </button>
      </form>
    </section>
  );
}

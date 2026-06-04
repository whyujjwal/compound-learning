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

  const sectionStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    paddingTop: 16,
    borderTop: "1px solid var(--hairline)",
  };

  const headStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  };

  const titleStyle: React.CSSProperties = {
    margin: "0 0 2px",
    fontFamily: "var(--font-mono, monospace)",
    fontSize: 10,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "var(--muted)",
    fontWeight: 500,
  };

  const subStyle: React.CSSProperties = {
    margin: 0,
    fontSize: 13,
    color: "var(--muted)",
  };

  if (loading) {
    return (
      <section style={sectionStyle}>
        <div style={headStyle}>
          <div>
            <h2 style={titleStyle}>Coach</h2>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>Loading…</p>
      </section>
    );
  }

  const coachDisabled = !aiStatus?.enabled;

  return (
    <section style={sectionStyle}>
      <div style={headStyle}>
        <div>
          <h2 style={titleStyle}>Coach</h2>
          <p style={subStyle}>
            Ask anything — Coach reads your real stats, tracks, and retention data.
          </p>
        </div>
        {active && (
          <button
            type="button"
            style={{
              height: 26,
              padding: "0 10px",
              borderRadius: 4,
              border: "1px solid var(--hairline)",
              background: "transparent",
              color: "var(--muted)",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              transition: "background 100ms, color 100ms",
              flexShrink: 0,
            }}
            onClick={resetConversation}
          >
            New conversation
          </button>
        )}
      </div>

      {nudge?.content && !active && (
        <div
          style={{
            padding: "12px 16px",
            border: "1px solid var(--hairline)",
            borderRadius: 6,
            background: "var(--panel)",
          }}
        >
          <span
            style={{
              display: "block",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--accent)",
              marginBottom: 8,
            }}
          >
            Today&apos;s insight
          </span>
          <p style={{ margin: 0, fontStyle: "italic", fontSize: 14, lineHeight: 1.55, color: "var(--text)" }}>
            {nudge.content}
          </p>
        </div>
      )}

      {coachDisabled && (
        <div
          style={{
            fontSize: 13,
            color: "var(--muted)",
            padding: "12px 16px",
            border: "1px dashed var(--hairline)",
            borderRadius: 6,
          }}
        >
          Coach is offline. Add an AI API key to your backend{" "}
          <code style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 12 }}>.env</code> to enable it.
        </div>
      )}

      {!active ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              type="button"
              style={{
                textAlign: "left",
                background: "var(--panel)",
                border: "1px solid var(--hairline)",
                borderRadius: 6,
                padding: "8px 12px",
                color: "var(--muted)",
                fontSize: 12.5,
                cursor: coachDisabled ? "not-allowed" : "pointer",
                opacity: coachDisabled ? 0.5 : 1,
                transition: "background var(--dur) var(--ease-out), color var(--dur) var(--ease-out)",
              }}
              onClick={() => startNew(q)}
              disabled={coachDisabled}
            >
              {q}
            </button>
          ))}
        </div>
      ) : (
        <div
          ref={messagesRef}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            maxHeight: 480,
            overflowY: "auto",
            paddingRight: 8,
          }}
        >
          {active.messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                flexDirection: msg.role === "USER" ? "row-reverse" : "row",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  flexShrink: 0,
                  background: msg.role === "USER" ? "var(--accent)" : "var(--panel)",
                  color: msg.role === "USER" ? "#ffffff" : "var(--muted)",
                }}
              >
                {msg.role === "USER" ? "You" : "C"}
              </div>
              <div
                style={{
                  background: msg.role === "USER" ? "var(--accent-soft)" : "var(--panel)",
                  border: "1px solid var(--hairline)",
                  padding: "10px 14px",
                  borderRadius: 6,
                  maxWidth: "80%",
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: "var(--text)",
                }}
              >
                {msg.role === "ASSISTANT" &&
                  msg.tool_calls &&
                  msg.tool_calls.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                      {msg.tool_calls.map((tc) => (
                        <span
                          key={tc.id}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "2px 8px",
                            borderRadius: 12,
                            fontFamily: "var(--font-mono, monospace)",
                            fontSize: 10,
                            color: "var(--accent)",
                            background: "var(--accent-soft)",
                            border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)",
                          }}
                        >
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
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 10,
                  background: "var(--panel)",
                  color: "var(--muted)",
                  flexShrink: 0,
                }}
              >
                C
              </div>
              <div
                style={{
                  background: "var(--panel)",
                  border: "1px solid var(--hairline)",
                  padding: "10px 14px",
                  borderRadius: 6,
                }}
              >
                <span style={{ display: "inline-flex", gap: 4 }}>
                  <TypingDot delay={0} />
                  <TypingDot delay={0.15} />
                  <TypingDot delay={0.3} />
                </span>
              </div>
            </div>
          )}
          {error && (
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 10,
                  background: "color-mix(in srgb, var(--bad) 12%, transparent)",
                  color: "var(--bad)",
                  flexShrink: 0,
                }}
              >
                !
              </div>
              <div
                style={{
                  background: "var(--panel)",
                  border: "1px solid var(--hairline)",
                  padding: "10px 14px",
                  borderRadius: 6,
                  color: "var(--bad)",
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            </div>
          )}
        </div>
      )}

      <form
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 8,
          marginTop: 12,
          paddingTop: 12,
          borderTop: "1px solid var(--hairline)",
        }}
        onSubmit={handleSubmit}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={coachDisabled ? "Set API key to enable Coach" : "Ask about your learning…"}
          disabled={sending || coachDisabled}
          rows={2}
          style={{
            background: "var(--panel)",
            border: "1px solid var(--hairline)",
            borderRadius: 6,
            padding: "10px 12px",
            font: "inherit",
            fontSize: 14,
            color: "var(--text)",
            resize: "none",
            outline: "none",
            transition: "border-color var(--dur) var(--ease-out)",
            opacity: sending || coachDisabled ? 0.6 : 1,
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as unknown as FormEvent);
            }
          }}
        />
        <button
          type="submit"
          style={{
            alignSelf: "end",
            height: 36,
            padding: "0 16px",
            borderRadius: 4,
            border: "1px solid transparent",
            background: "var(--accent)",
            color: "#ffffff",
            fontSize: 13,
            fontWeight: 500,
            cursor: sending || !input.trim() || coachDisabled ? "not-allowed" : "pointer",
            opacity: sending || !input.trim() || coachDisabled ? 0.5 : 1,
            transition: "background 100ms",
          }}
          disabled={sending || !input.trim() || coachDisabled}
        >
          Send
        </button>
      </form>
    </section>
  );
}

function TypingDot({ delay }: { delay: number }) {
  return (
    <span
      style={{
        width: 4,
        height: 4,
        borderRadius: "50%",
        background: "var(--muted)",
        display: "inline-block",
        animation: `typing-bounce 1.2s ${delay}s infinite ease-in-out`,
      }}
    />
  );
}

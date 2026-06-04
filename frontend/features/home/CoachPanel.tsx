"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Markdown } from "@/components/Markdown";
import { api, type ChatMessage, type CoachInsight, type Conversation } from "@/lib/api";
import { Button, Skeleton } from "@/components/primitives";

const QUICK_PROMPTS = [
  "How am I doing overall?",
  "Which concepts am I struggling with most?",
  "What should I focus on this week?",
  "Give me today's first 30-minute plan.",
];

function TypingIndicator() {
  return (
    <span
      aria-label="Coach is thinking"
      style={{
        display: "inline-flex",
        gap: 3,
        alignItems: "center",
        height: 20,
      }}
    >
      {[0, 0.2, 0.4].map((delay) => (
        <span
          key={delay}
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "var(--muted)",
            animation: `coach-bounce 1s ${delay}s ease-in-out infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes coach-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-3px); opacity: 1; }
        }
      `}</style>
    </span>
  );
}

export function CoachPanel() {
  const [aiStatus, setAIStatus] = useState<{
    enabled: boolean;
    provider: string;
    model: string;
  } | null>(null);
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

  const coachDisabled = !aiStatus?.enabled;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      {/* Panel header */}
      <div
        style={{
          padding: "16px 16px 12px",
          borderBottom: "1px solid var(--hairline)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text)",
              letterSpacing: "0.01em",
            }}
          >
            Coach
          </h2>
          {!loading && !coachDisabled && (
            <p
              style={{
                fontSize: 11,
                color: "var(--muted)",
                marginTop: 1,
              }}
            >
              {aiStatus?.model ?? "AI"}
            </p>
          )}
        </div>
        {active && (
          <Button variant="ghost" size="sm" onClick={resetConversation}>
            New
          </Button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton height={14} width="80%" />
          <Skeleton height={14} width="60%" />
          <Skeleton height={14} width="70%" />
        </div>
      )}

      {/* Offline notice */}
      {!loading && coachDisabled && (
        <div
          style={{
            margin: 12,
            padding: "10px 12px",
            borderRadius: 4,
            background: "var(--overlay-hover)",
            border: "1px solid var(--hairline)",
            fontSize: 13,
            color: "var(--muted)",
            lineHeight: 1.5,
          }}
        >
          Coach is offline.{" "}
          <code
            style={{
              fontSize: 12,
              background: "var(--code-bg)",
              padding: "1px 4px",
              borderRadius: 3,
            }}
          >
            .env
          </code>{" "}
          key required.
        </div>
      )}

      {/* Daily nudge */}
      {!loading && !active && nudge?.content && (
        <div
          style={{
            margin: "12px 12px 0",
            padding: "10px 12px",
            borderRadius: 4,
            background: "var(--accent-soft)",
            border: "1px solid rgba(35,131,226,.15)",
            flexShrink: 0,
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--accent)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Today&apos;s insight
          </p>
          <p
            style={{
              fontSize: 13,
              color: "var(--text)",
              lineHeight: 1.55,
            }}
          >
            {nudge.content}
          </p>
        </div>
      )}

      {/* Quick prompts */}
      {!loading && !active && (
        <div
          style={{
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            flexShrink: 0,
          }}
        >
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              type="button"
              disabled={coachDisabled}
              onClick={() => startNew(q)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                fontSize: 13,
                color: coachDisabled ? "var(--muted)" : "var(--text)",
                background: "transparent",
                border: "1px solid var(--hairline)",
                borderRadius: 4,
                cursor: coachDisabled ? "not-allowed" : "pointer",
                transition: "background var(--dur-fast), border-color var(--dur-fast)",
                lineHeight: 1.4,
              }}
              onMouseEnter={(e) => {
                if (!coachDisabled) {
                  e.currentTarget.style.background = "var(--overlay-hover)";
                  e.currentTarget.style.borderColor = "rgba(35,131,226,.25)";
                }
              }}
              onMouseLeave={(e) => {
                if (!coachDisabled) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "var(--hairline)";
                }
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Message thread */}
      {active && (
        <div
          ref={messagesRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "12px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            minHeight: 0,
          }}
        >
          {active.messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                alignItems: msg.role === "USER" ? "flex-end" : "flex-start",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "var(--muted)",
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {msg.role === "USER" ? "You" : "Coach"}
              </span>

              {/* Tool call pills */}
              {msg.role === "ASSISTANT" &&
                msg.tool_calls &&
                msg.tool_calls.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 4,
                    }}
                  >
                    {msg.tool_calls.map((tc) => (
                      <span
                        key={tc.id}
                        style={{
                          fontSize: 11,
                          color: "var(--muted)",
                          background: "var(--overlay-hover)",
                          border: "1px solid var(--hairline)",
                          borderRadius: 3,
                          padding: "1px 6px",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {tc.name}
                      </span>
                    ))}
                  </div>
                )}

              {msg.content && (
                <div
                  style={{
                    maxWidth: "90%",
                    padding: "8px 11px",
                    borderRadius: msg.role === "USER" ? "8px 8px 2px 8px" : "2px 8px 8px 8px",
                    background:
                      msg.role === "USER"
                        ? "var(--accent)"
                        : "var(--panel)",
                    border: msg.role === "USER"
                      ? "none"
                      : "1px solid var(--hairline)",
                    fontSize: 13,
                    color: msg.role === "USER" ? "#fff" : "var(--text)",
                    lineHeight: 1.55,
                  }}
                >
                  {msg.role === "ASSISTANT" ? (
                    <div
                      style={{
                        fontSize: 13,
                        lineHeight: 1.55,
                        color: "var(--text)",
                      }}
                    >
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {sending && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 4,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  color: "var(--muted)",
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Coach
              </span>
              <div
                style={{
                  padding: "8px 11px",
                  borderRadius: "2px 8px 8px 8px",
                  background: "var(--panel)",
                  border: "1px solid var(--hairline)",
                }}
              >
                <TypingIndicator />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              style={{
                padding: "8px 11px",
                borderRadius: 4,
                background: "rgba(235, 87, 87, 0.08)",
                border: "1px solid rgba(235, 87, 87, 0.2)",
                fontSize: 13,
                color: "var(--bad)",
              }}
            >
              {error}
            </div>
          )}
        </div>
      )}

      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        style={{
          borderTop: "1px solid var(--hairline)",
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            coachDisabled
              ? "Set AI key to enable Coach"
              : "Ask about your learning…"
          }
          disabled={sending || coachDisabled}
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSubmit(e as unknown as FormEvent);
            }
          }}
          style={{
            width: "100%",
            resize: "none",
            fontSize: 13,
            color: "var(--text)",
            background: "var(--overlay-hover)",
            border: "1px solid var(--hairline)",
            borderRadius: 4,
            padding: "8px 10px",
            outline: "none",
            transition: "border-color var(--dur-fast)",
            lineHeight: 1.5,
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "var(--accent)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "var(--hairline)";
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={sending || !input.trim() || coachDisabled}
            loading={sending}
          >
            Send
          </Button>
        </div>
      </form>
    </div>
  );
}

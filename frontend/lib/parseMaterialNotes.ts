export type MaterialSection = {
  key: "watch" | "do" | "deliverable" | "recall";
  title: string;
  lines: string[];
};

export type ParsedMaterialNotes = {
  structured: boolean;
  legacy?: string;
  sections: MaterialSection[];
};

const SECTION_HEADERS: { key: MaterialSection["key"]; match: RegExp; title: string }[] = [
  { key: "watch", match: /^WATCH\b/i, title: "Watch" },
  { key: "do", match: /^DO\b/i, title: "Do" },
  { key: "deliverable", match: /^DELIVERABLE\b/i, title: "Deliverable" },
  { key: "recall", match: /^RECALL\b/i, title: "Recall" },
];

function cleanLine(line: string): string {
  return line.replace(/^[•\-\d]+\.?\s*/, "").trim();
}

export function parseMaterialNotes(content: string | null | undefined): ParsedMaterialNotes {
  if (!content?.trim()) {
    return { structured: false, sections: [] };
  }

  const lines = content.split("\n");
  const hasStructure = lines.some((line) =>
    SECTION_HEADERS.some((h) => h.match.test(line.trim()))
  );

  if (!hasStructure) {
    return { structured: false, legacy: content.trim(), sections: [] };
  }

  const sections: MaterialSection[] = [];
  let current: MaterialSection | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const header = SECTION_HEADERS.find((h) => h.match.test(line));
    if (header) {
      current = { key: header.key, title: header.title, lines: [] };
      sections.push(current);
      continue;
    }

    if (current) {
      const cleaned = cleanLine(line);
      if (cleaned) current.lines.push(cleaned);
    }
  }

  return { structured: true, sections };
}

export type BriefItem = {
  material_title: string;
  material_content: string | null;
  material_url: string | null;
  resource_type: string | null;
  kind: "review" | "new";
  estimated_minutes: number;
};

/** Fallback when notes are empty or legacy one-liners — still gives a useful session script. */
export function briefForItem(item: BriefItem): ParsedMaterialNotes {
  const parsed = parseMaterialNotes(item.material_content);
  if (parsed.structured && parsed.sections.length > 0) return parsed;

  const focus = parsed.legacy?.trim() || "";
  const rt = (item.resource_type || "practice").toLowerCase();
  const mins = item.estimated_minutes || 25;
  const isReview = item.kind === "review";

  if (rt === "practice" || item.material_url?.includes("leetcode.com")) {
    return {
      structured: true,
      sections: [
        {
          key: "watch",
          title: "Understand",
          lines: [
            focus || `Open the problem and read constraints before coding.`,
            "Identify the pattern — what data structure or technique applies?",
          ],
        },
        {
          key: "do",
          title: "Do",
          lines: [
            "Write approach in plain English (2 sentences).",
            "State time/space complexity, then code from scratch.",
            "Run 2 tests including one edge case.",
          ],
        },
        {
          key: "deliverable",
          title: "Deliverable",
          lines: ["Accepted submission", "One-line pattern tag in your notes"],
        },
        {
          key: "recall",
          title: "Recall",
          lines: [
            `Explain the ${item.material_title} pattern in 30 seconds.`,
            "Name one other problem that uses the same idea.",
          ],
        },
      ],
    };
  }

  if (rt === "video" || rt === "course") {
    return {
      structured: true,
      sections: [
        {
          key: "watch",
          title: "Watch",
          lines: [
            focus || `Watch ~${mins} min. Pause every 5 min to summarize.`,
            "Note one “aha” and one thing that still feels fuzzy.",
          ],
        },
        {
          key: "do",
          title: "Do",
          lines: [
            "Sketch the key idea — diagram, table, or formula.",
            "Write 3 bullet takeaways in your own words.",
          ],
        },
        {
          key: "deliverable",
          title: "Deliverable",
          lines: ["3 takeaway bullets saved", "One connection to prior material"],
        },
        {
          key: "recall",
          title: "Recall",
          lines: [
            `Summarize ${item.material_title} in 60 seconds without notes.`,
            "What's the most common mistake here?",
          ],
        },
      ],
    };
  }

  return {
    structured: true,
    sections: [
      {
        key: "watch",
        title: isReview ? "Refresh" : "Read",
        lines: [focus || `Spend ~${mins} min with the material.`],
      },
      {
        key: "do",
        title: "Do",
        lines: ["Active reading — notes in your own words", "Extract one concrete example"],
      },
      {
        key: "deliverable",
        title: "Deliverable",
        lines: ["Short summary saved", "One question you'd ask an expert"],
      },
      {
        key: "recall",
        title: "Recall",
        lines: [`Explain ${item.material_title} from memory.`],
      },
    ],
  };
}


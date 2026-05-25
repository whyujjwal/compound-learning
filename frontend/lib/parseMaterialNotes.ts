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

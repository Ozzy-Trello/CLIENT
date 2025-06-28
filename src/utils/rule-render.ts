// Utility to convert rule template strings (with placeholders) into human-readable sentences.
// Placeholders are either <placeholder> or [text].
// The function does not hard-code each placeholder name – it discovers them at runtime
// and looks them up inside the provided condition object.

import { LookupCache } from "@utils/lookup-cache";

export interface ValueLike {
  label?: string;
  value?: any;
  operator?: string;
  data?: any;
  [key: string]: any;
}

function stringify(val: any): string {
  if (val == null) return "";
  if (typeof val === "string") {
    const noTags = val.replace(/<[^>]*>/g, "");
    if (/^[0-9a-f]{8}-/i.test(noTags)) {
      const lbl = LookupCache.any(noTags);
      if (lbl) return lbl;
    }
    return noTags.replace(/\./g, " ");
  }
  if (typeof val === "number") return String(val);
  if (typeof val === "object") {
    // Try common keys
    if (val.label) return stringify(val.label);
    if (val.text) return stringify(val.text);
    if (val.operator) return stringify(val.operator);
    if (val.value) return stringify(val.value);
  }
  return "";
}

function lookup(condition: any, key: string): any {
  if (!condition) return undefined;
  if (key in condition) return condition[key];
  // snake_case -> camelCase
  const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  if (camel in condition) return condition[camel];
  // camelCase -> snake_case
  const snake = key.replace(/([A-Z])/g, "_$1").toLowerCase();
  if (snake in condition) return condition[snake];
  return undefined;
}

export function renderRulePattern(
  pattern: string,
  condition: Record<string, any>
): string {
  if (!pattern) return "";

  // Convert dashes to spaces first for readability.
  const tokens = pattern.replace(/-/g, " ").split(/(<[^>]+>|\[[^\]]+\])/g);
  const parts: string[] = [];

  tokens.forEach((tok) => {
    if (!tok) return;

    // Placeholder – either <...> or [...] syntax
    if (
      (tok.startsWith("<") && tok.endsWith(">")) ||
      (tok.startsWith("[") && tok.endsWith("]"))
    ) {
      const raw = tok.slice(1, -1); // strip brackets
      let key = raw;
      // Special-case "text" inside square-bracket – becomes condition.text
      if (raw === "text") key = "text";

      if (key === "filter") return; // skip filters

      const replacement = stringify(lookup(condition, key));
      if (replacement) {
        const quotedKeys = [
          "text",
          "text_input",
          "textInput",
          "checklist_name",
          "checklistName",
          "message",
        ];
        const quoted = quotedKeys.includes(key)
          ? `"${replacement}"`
          : replacement;
        parts.push(quoted);
      }
    } else {
      parts.push(tok);
    }
  });

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function renderRulePatternHuman(
  pattern: string,
  condition: Record<string, any>
): string {
  let sentence = renderRulePattern(pattern, condition);

  // 1️⃣  Collapse duplicate word sequences like "card is card" or "checklist checklist"
  sentence = sentence.replace(/\b(\w+) is \1\b/gi, "$1 is");
  sentence = sentence.replace(/\b(\w+)\s+\1\b/gi, "$1");

  // 2️⃣  Remove trailing prepositions left after missing placeholder e.g., "to", "in"
  sentence = sentence.replace(/\b(?:to|in|of|by)\s*$/i, "");

  return sentence.trim();
}

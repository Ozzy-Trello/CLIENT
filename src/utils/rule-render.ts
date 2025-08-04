// Utility to convert rule template strings (with placeholders) into human-readable sentences.
// Placeholders are either <placeholder> or [text].
// The function does not hard-code each placeholder name – it discovers them at runtime
// and looks them up inside the provided condition object.

import { LookupCache } from "@utils/lookup-cache";
import { EnumSelectionType } from "@myTypes/automation-rule";

export interface ValueLike {
  label?: string;
  value?: any;
  operator?: string;
  data?: any;
  [key: string]: any;
}

// Utility function to prefetch and cache data for rule rendering
export async function prefetchRuleData(
  workspaceId: string,
  rules: any[],
  options: {
    labels?: any[];
    customFields?: any[];
    users?: any[];
    lists?: any[];
    boards?: any[];
  } = {}
) {
  // Cache labels
  if (options.labels && options.labels.length > 0) {
    LookupCache.rememberMany(
      "label",
      options.labels.map((l: { id: string; name: string }) => ({
        id: l.id,
        name: l.name,
      }))
    );
  }

  // Cache custom fields
  if (options.customFields && options.customFields.length > 0) {
    LookupCache.rememberMany(
      "field",
      options.customFields.map((f: { id: string; name: string }) => ({
        id: f.id,
        name: f.name,
      }))
    );
  }

  // Cache users
  if (options.users && options.users.length > 0) {
    LookupCache.rememberMany(
      "user",
      options.users.map(
        (u: { id: string; name?: string; username?: string }) => ({
          id: u.id,
          name: u.name || u.username || u.id,
        })
      )
    );
  }

  // Cache lists
  if (options.lists && options.lists.length > 0) {
    LookupCache.rememberMany(
      "list",
      options.lists.map((l: { id: string; name: string }) => ({
        id: l.id,
        name: l.name,
      }))
    );
  }

  // Cache boards
  if (options.boards && options.boards.length > 0) {
    LookupCache.rememberMany(
      "board",
      options.boards.map((b: { id: string; name: string }) => ({
        id: b.id,
        name: b.name,
      }))
    );
  }
}

function stringify(val: any): string {
  if (val == null) return "";
  if (typeof val === "string") {
    const noTags = val.replace(/<[^>]*>/g, "");
    if (/^[0-9a-f]{8}-/i.test(noTags)) {
      const lbl = LookupCache.any(noTags);
      console.log("[RULE-RENDER] UUID lookup:", noTags, "->", lbl);
      if (lbl) return lbl;
    }
    return noTags.replace(/\./g, " ");
  }
  if (typeof val === "number") return String(val);
  if (typeof val === "object") {
    // Handle empty arrays specially
    if (Array.isArray(val) && val.length === 0) {
      return ""; // Return empty string for empty arrays
    }
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
  
  // Try direct key lookup
  let value = condition[key];
  if (value !== undefined) {
    // If the value looks like a UUID, try to resolve it using LookupCache
    if (typeof value === 'string' && isUUID(value)) {
      const resolved = LookupCache.any(value);
      if (resolved) {
        console.log(`[RULE-RENDER] Resolved UUID ${value} to ${resolved}`);
        return resolved;
      }
    }
    return value;
  }
  
  // snake_case -> camelCase
  const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  if (camel in condition) {
    value = condition[camel];
    if (typeof value === 'string' && isUUID(value)) {
      const resolved = LookupCache.any(value);
      if (resolved) {
        console.log(`[RULE-RENDER] Resolved UUID ${value} to ${resolved} (camelCase)`);
        return resolved;
      }
    }
    return value;
  }
  
  // camelCase -> snake_case
  const snake = key.replace(/([A-Z])/g, "_$1").toLowerCase();
  if (snake in condition) {
    value = condition[snake];
    if (typeof value === 'string' && isUUID(value)) {
      const resolved = LookupCache.any(value);
      if (resolved) {
        console.log(`[RULE-RENDER] Resolved UUID ${value} to ${resolved} (snake_case)`);
        return resolved;
      }
    }
    return value;
  }
  
  return undefined;
}

// Helper function to check if a string looks like a UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function renderFiltersHuman(filters: any[]): string {
  if (!filters || filters.length === 0) return "";

  const filterTexts = filters
    .map((filter) => {
      if (filter.type) {
        return renderRulePatternHuman(filter.type, filter);
      }
      return "";
    })
    .filter(Boolean);

  if (filterTexts.length === 0) return "";
  return ` (${filterTexts.join(", ")})`;
}

function renderDateExpressionsHuman(expressions: any[]): string {
  if (!expressions || expressions.length === 0) return "";

  const expressionTexts = expressions
    .map((expr) => {
      if (expr.type === "relative") {
        return `${expr.operator} ${expr.unit}`;
      } else if (expr.type === "numeric") {
        return `${expr.operator} ${expr.value} ${expr.unit}`;
      }
      return "";
    })
    .filter(Boolean);

  return expressionTexts.join(" or ");
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

      console.log("[RULE-RENDER] Processing placeholder:", { tok, raw, key });

      // Special handling for text_comparison
      if (key === "text_comparison" || key === "text comparison") {
        console.log("[RULE-RENDER] Processing text_comparison:", {
          key,
          condition: condition.text_comparison,
          fullCondition: condition,
        });

        // Try multiple possible locations for text_comparison data
        let textComp = condition.text_comparison;
        if (!textComp && condition.textComparison) {
          textComp = condition.textComparison;
        }

        // First, try the frontend structure with expressions array
        if (textComp?.expressions && Array.isArray(textComp.expressions)) {
          textComp = textComp.expressions;
        }

        // Try looking for value object (frontend structure)
        if (!textComp && condition.text_comparison?.value) {
          textComp = [condition.text_comparison.value];
        }

        // Try nested condition structure
        if (!textComp && condition.condition) {
          textComp = condition.condition.text_comparison;
          if (textComp?.expressions && Array.isArray(textComp.expressions)) {
            textComp = textComp.expressions;
          }
        }
        if (!textComp && condition.condition?.textComparison) {
          textComp = condition.condition.textComparison;
          if (textComp?.expressions && Array.isArray(textComp.expressions)) {
            textComp = textComp.expressions;
          }
        }

        // Try data structure
        if (!textComp && condition.data) {
          textComp = condition.data.text_comparison;
          if (textComp?.expressions && Array.isArray(textComp.expressions)) {
            textComp = textComp.expressions;
          }
        }
        if (!textComp && condition.data?.textComparison) {
          textComp = condition.data.textComparison;
          if (textComp?.expressions && Array.isArray(textComp.expressions)) {
            textComp = textComp.expressions;
          }
        }

        // Also try looking for the data in the same structure as the backend expects
        if (!textComp && condition[EnumSelectionType.TextComparison]) {
          textComp = condition[EnumSelectionType.TextComparison];
        }

        console.log("[RULE-RENDER] Found text_comparison data:", textComp);
        console.log(
          "[RULE-RENDER] All condition keys:",
          Object.keys(condition)
        );
        console.log(
          "[RULE-RENDER] Condition structure:",
          JSON.stringify(condition, null, 2)
        );

        // Debug: Check if text_comparison exists in different formats
        console.log("[RULE-RENDER] Debug text_comparison access:");
        console.log(
          "  - condition.text_comparison:",
          condition.text_comparison
        );
        console.log("  - condition.textComparison:", condition.textComparison);
        console.log(
          "  - condition.text_comparison?.expressions:",
          condition.text_comparison?.expressions
        );
        console.log(
          "  - condition.textComparison?.expressions:",
          condition.textComparison?.expressions
        );
        console.log(
          "  - condition[EnumSelectionType.TextComparison]:",
          condition[EnumSelectionType.TextComparison]
        );
        console.log(
          "  - condition.condition?.text_comparison:",
          condition.condition?.text_comparison
        );
        console.log(
          "  - condition.condition?.textComparison:",
          condition.condition?.textComparison
        );
        console.log(
          "  - condition.data?.text_comparison:",
          condition.data?.text_comparison
        );
        console.log(
          "  - condition.data?.textComparison:",
          condition.data?.textComparison
        );

        if (textComp && Array.isArray(textComp) && textComp.length === 0) {
          console.log("[RULE-RENDER] Empty text_comparison array, skipping");
          return;
        }
        if (textComp && Array.isArray(textComp) && textComp.length > 0) {
          console.log(
            "[RULE-RENDER] Processing text_comparison array:",
            textComp
          );
          // Handle array of text comparisons
          const comparisons = textComp.map((comp: any) => {
            const { operator, text, value } = comp;
            const textValue = text || value;
            switch (operator) {
              case "contains":
                return `containing "${textValue}"`;
              case "equals":
                return `named "${textValue}"`;
              case "starts_with":
              case "starting-with":
                return `starting with "${textValue}"`;
              case "ends_with":
              case "ending-with":
                return `ending with "${textValue}"`;
              case "not_contains":
                return `not containing "${textValue}"`;
              case "not_equals":
                return `not named "${textValue}"`;
              default:
                return textValue ? `matching "${textValue}"` : "with any text";
            }
          });

          if (comparisons.length === 1) {
            parts.push(comparisons[0]);
          } else {
            parts.push(comparisons.join(" or "));
          }
          console.log("[RULE-RENDER] Text comparison result:", comparisons);
          return;
        }
        // If text_comparison exists but is not an array, try to handle it as a single object
        if (
          textComp &&
          typeof textComp === "object" &&
          !Array.isArray(textComp)
        ) {
          console.log(
            "[RULE-RENDER] Processing single text_comparison object:",
            textComp
          );
          const { operator, text, value } = textComp;
          const textValue = text || value;
          if (textValue) {
            switch (operator) {
              case "contains":
                parts.push(`containing "${textValue}"`);
                return;
              case "equals":
                parts.push(`named "${textValue}"`);
                return;
              case "starts_with":
              case "starting-with":
                parts.push(`starting with "${textValue}"`);
                return;
              case "ends_with":
              case "ending-with":
                parts.push(`ending with "${textValue}"`);
                return;
              case "not_contains":
                parts.push(`not containing "${textValue}"`);
                return;
              case "not_equals":
                parts.push(`not named "${textValue}"`);
                return;
              default:
                parts.push(`matching "${textValue}"`);
                return;
            }
          }
        }

        // Try to handle as a single comparison object with operator and text properties
        if (
          textComp &&
          typeof textComp === "object" &&
          textComp.operator &&
          textComp.text
        ) {
          console.log(
            "[RULE-RENDER] Processing single comparison object:",
            textComp
          );
          const { operator, text } = textComp;
          switch (operator) {
            case "contains":
              parts.push(`containing "${text}"`);
              return;
            case "equals":
              parts.push(`named "${text}"`);
              return;
            case "starts_with":
            case "starting-with":
              parts.push(`starting with "${text}"`);
              return;
            case "ends_with":
            case "ending-with":
              parts.push(`ending with "${text}"`);
              return;
            case "not_contains":
              parts.push(`not containing "${text}"`);
              return;
            case "not_equals":
              parts.push(`not named "${text}"`);
              return;
            default:
              parts.push(`matching "${text}"`);
              return;
          }
        }

        // If no text_comparison data found, don't add anything (just "attachment")
        console.log("[RULE-RENDER] No text_comparison data found, skipping");
        return;
      }

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
      } else {
        // If we can't find a replacement, show a user-friendly placeholder
        console.warn(
          `[RULE-RENDER] No replacement found for placeholder: ${key}`,
          { condition }
        );
        const friendlyKey = key.replace(/_/g, " ");

        // Special handling for list and board IDs that couldn't be resolved
        if (key === "list" || key === "board") {
          const value = lookup(condition, key);
          if (
            value &&
            typeof value === "string" &&
            /^[0-9a-f]{8}-/i.test(value)
          ) {
            parts.push(`[${friendlyKey} ID: ${value.substring(0, 8)}...]`);
          } else {
            parts.push(`[${friendlyKey}]`);
          }
        } else {
          parts.push(`[${friendlyKey}]`);
        }
      }
    } else {
      parts.push(tok);
    }
  });

  const result = parts.join(" ").replace(/\s+/g, " ").trim();
  console.log(`[RULE-RENDER] renderRulePattern: "${pattern}" -> "${result}"`);
  return result;
}

export function renderRulePatternHuman(
  pattern: string,
  condition: Record<string, any>
): string {
  console.log("[RULE-RENDER] Input:", { pattern, condition });

  if (!pattern) {
    console.warn("[RULE-RENDER] Empty pattern provided");
    return "";
  }

  let sentence = renderRulePattern(pattern, condition);
  console.log("[RULE-RENDER] After renderRulePattern:", sentence);

  // Handle special cases and complex placeholders
  if (condition) {
    // Handle date expressions
    if (condition.date_expression && condition.date_expression.expressions) {
      const dateExpr = renderDateExpressionsHuman(
        condition.date_expression.expressions
      );
      if (dateExpr) {
        sentence = sentence.replace(/\bdate expression\b/gi, dateExpr);
      }
    }

    // Handle text comparison placeholders
    if (condition.text_comparison) {
      const textComp = renderTextComparisonHuman(condition.text_comparison);
      sentence = sentence.replace(/\[text comparison\]/gi, textComp);
      sentence = sentence.replace(/<text_comparison>/gi, textComp);
    }

    // Handle roles in optional_by (check both snake_case and camelCase)
    const optionalBy = condition.optional_by || condition.optionalBy;
    if (optionalBy && optionalBy.data) {
      console.log("[RULE-RENDER] Found optionalBy data:", optionalBy);
      const roleText = renderOptionalByHuman(optionalBy);
      console.log("[RULE-RENDER] Role text result:", roleText);
      // Replace "by specific users" with the actual role text
      sentence = sentence.replace(/\bby specific users\b/gi, roleText);
      sentence = sentence.replace(/\bby-role\b/gi, roleText);
      sentence = sentence.replace(/\bby-anyone\b/gi, "by anyone");
    }

    // Handle filter placeholders that show as [filter]
    sentence = sentence.replace(/\[filter\]/gi, "");

    // Special handling for attachment rules
    if (pattern.includes("attachment")) {
      // Handle text comparison if present
      if (condition.text_comparison || condition.textComparison) {
        const textComp = renderTextComparisonHuman(
          condition.text_comparison || condition.textComparison
        );
        if (textComp && textComp.trim() !== "") {
          sentence = sentence.replace(
            /attachment is added/gi,
            `attachment ${textComp} is added`
          );
          sentence = sentence.replace(
            /attachment is removed/gi,
            `attachment ${textComp} is removed`
          );
        }
      }

      // Clean up awkward phrasing when no text comparison
      sentence = sentence.replace(
        /when an attachment is card attachment added/gi,
        "when an attachment is added"
      );
      sentence = sentence.replace(
        /when an attachment is card attachment removed/gi,
        "when an attachment is removed"
      );
      sentence = sentence.replace(
        /when an attachment is attachment added/gi,
        "when an attachment is added"
      );
      sentence = sentence.replace(
        /when an attachment is attachment removed/gi,
        "when an attachment is removed"
      );
    }

    // Handle empty text_comparison arrays (common in attachment rules)
    if (
      condition.text_comparison &&
      Array.isArray(condition.text_comparison) &&
      condition.text_comparison.length === 0
    ) {
      sentence = sentence.replace(/\[text comparison\]/gi, "");
      sentence = sentence.replace(/<text_comparison>/gi, "");
    }

    // Clean up redundant text patterns
    sentence = cleanupRedundantText(sentence);
  }

  // Capitalize first letter and ensure proper sentence structure
  const result = sentence.charAt(0).toUpperCase() + sentence.slice(1);
  console.log("[RULE-RENDER] Final result:", result);

  return result;
}

// Enhanced version specifically for rule state display
export function renderRuleStateHuman(
  pattern: string,
  condition: Record<string, any>
): string {
  const humanReadable = renderRulePatternHuman(pattern, condition);

  // If we still have placeholders, show them in a more user-friendly way
  let result = humanReadable
    .replace(/<([^>]+)>/g, (match, placeholder) => {
      const value = lookup(condition, placeholder);
      if (value) {
        return stringify(value);
      }
      return `[${placeholder.replace(/_/g, " ")}]`;
    })
    .replace(/\[([^\]]+)\]/g, (match, placeholder) => {
      const value = lookup(condition, placeholder);
      if (value) {
        return `"${stringify(value)}"`;
      }
      return `[${placeholder.replace(/_/g, " ")}]`;
    });

  return result;
}

// Helper function to render text comparison in human-readable format
function renderTextComparisonHuman(textComparison: any): string {
  if (!textComparison) {
    return "";
  }

  // Handle array of text comparisons
  if (Array.isArray(textComparison)) {
    if (textComparison.length === 0) {
      return "";
    }

    const comparisons = textComparison.map((comp: any) => {
      const { operator, text } = comp;
      switch (operator) {
        case "contains":
          return `containing "${text}"`;
        case "equals":
          return `named "${text}"`;
        case "starts_with":
        case "starting-with":
          return `starting with "${text}"`;
        case "ends_with":
        case "ending-with":
          return `ending with "${text}"`;
        case "not_contains":
          return `not containing "${text}"`;
        case "not_equals":
          return `not named "${text}"`;
        default:
          return text ? `matching "${text}"` : "with any text";
      }
    });

    if (comparisons.length === 1) {
      return comparisons[0];
    } else {
      return comparisons.join(" or ");
    }
  }

  // Handle single object
  if (typeof textComparison === "object") {
    const { operator, value, text } = textComparison;
    const textValue = text || value;

    switch (operator) {
      case "contains":
        return `containing "${textValue}"`;
      case "equals":
        return `named "${textValue}"`;
      case "starts_with":
      case "starting-with":
        return `starting with "${textValue}"`;
      case "ends_with":
      case "ending-with":
        return `ending with "${textValue}"`;
      case "not_contains":
        return `not containing "${textValue}"`;
      case "not_equals":
        return `not named "${textValue}"`;
      default:
        return textValue ? `matching "${textValue}"` : "with any text";
    }
  }

  return "";
}

// Helper function to render optional_by in human-readable format
function renderOptionalByHuman(optionalBy: any): string {
  if (!optionalBy || typeof optionalBy !== "object") {
    console.log("[RULE-RENDER] renderOptionalByHuman: no optionalBy object");
    return "by anyone";
  }

  const { operator, data } = optionalBy;

  console.log("[RULE-RENDER] renderOptionalByHuman:", { operator, data });

  if (operator === "by-anyone" || !data || data.length === 0) {
    console.log("[RULE-RENDER] renderOptionalByHuman: by-anyone or no data");
    return "by anyone";
  }

  if (operator === "by-role" && data && data.length > 0) {
    console.log("[RULE-RENDER] Processing by-role with data:", data);

    // Try to resolve role names from UUIDs
    const roleNames = data.map((roleId: string) => {
      console.log(`[RULE-RENDER] Looking up role ID: ${roleId}`);

      // Debug: Check what's in the cache
      console.log(`[RULE-RENDER] Cache state for role ${roleId}:`, {
        roleLabel: LookupCache.label("role", roleId),
        anyLookup: LookupCache.any(roleId),
      });

      const roleName = LookupCache.label("role", roleId);
      console.log(`[RULE-RENDER] Role lookup result: ${roleId} -> ${roleName}`);

      // Also try the general any() lookup as fallback
      if (!roleName) {
        const fallbackName = LookupCache.any(roleId);
        console.log(
          `[RULE-RENDER] Fallback lookup: ${roleId} -> ${fallbackName}`
        );
        return fallbackName || roleId;
      }

      return roleName;
    });

    console.log("[RULE-RENDER] Final resolved role names:", roleNames);

    if (roleNames.length === 1) {
      const result = `by users with ${roleNames[0]} role`;
      console.log("[RULE-RENDER] Single role result:", result);
      return result;
    } else {
      const result = `by users with ${roleNames.join(" or ")} roles`;
      console.log("[RULE-RENDER] Multiple roles result:", result);
      return result;
    }
  }

  console.log(
    "[RULE-RENDER] renderOptionalByHuman: falling back to 'by specific users'"
  );
  return "by specific users";
}

// Helper function to clean up redundant text patterns
function cleanupRedundantText(text: string): string {
  return (
    text
      // Fix "Move card the card to" -> "Move the card to"
      .replace(/\bmove card the card to\b/gi, "move the card to")
      // Fix "Check custom field custom field" -> "Check custom field"
      .replace(
        /\b(check|set|update) custom field custom field\b/gi,
        "$1 custom field"
      )
      // Fix "custom field custom field" -> "custom field"
      .replace(/\bcustom field custom field\b/gi, "custom field")
      // Fix "card attachment added" -> "added"
      .replace(/\bcard attachment added\b/gi, "added")
      .replace(/\bcard attachment removed\b/gi, "removed")
      // Fix "attachment added" -> "added" (for attachment rules)
      .replace(/\battachment added\b/gi, "added")
      .replace(/\battachment removed\b/gi, "removed")
      // Fix "the card the card" -> "the card"
      .replace(/\bthe card the card\b/gi, "the card")
      // Fix "card card" -> "card"
      .replace(/\bcard card\b/gi, "card")
      // Fix "attachment attachment" -> "attachment"
      .replace(/\battachment attachment\b/gi, "attachment")
      // Fix "when an attachment is card attachment added" -> "when an attachment is added"
      .replace(
        /\bwhen an attachment (.*?) is card attachment added\b/gi,
        "when an attachment $1 is added"
      )
      // Fix "when an attachment is attachment added" -> "when an attachment is added"
      .replace(
        /\bwhen an attachment (.*?) is attachment added\b/gi,
        "when an attachment $1 is added"
      )
      // Fix "is card added-to" -> "is added to"
      .replace(/\bis card (added-to|moved-to|removed-from)\b/gi, "is $1")
      // Fix "a card by-role" -> "by specific users"
      .replace(/\ba card by-role\b/gi, "by specific users")
      .replace(/\ba card by-anyone\b/gi, "by anyone")
      // Clean up multiple spaces
      .replace(/\s+/g, " ")
      // Clean up trailing/leading spaces
      .trim()
  );
}

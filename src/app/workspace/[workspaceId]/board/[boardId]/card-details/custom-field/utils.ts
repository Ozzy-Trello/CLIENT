export const formatCustomFieldNumberValue = (value?: number | null): string => {
    if (value === undefined || value === null || Number.isNaN(value)) {
        return "";
    }
    const normalized = Number(value);
    return Number.isFinite(normalized)
        ? normalized.toString().replace(/\.0+$/, "")
        : "";
};

export const sanitizeCustomFieldNumber = (input: string): number | null => {
    const trimmed = input.toString().trim();
    if (trimmed === "") return null;
    const sanitized = trimmed.replace(",", ".");
    const parsed = Number(sanitized);
    return Number.isFinite(parsed) ? parsed : null;
};

export const normalizeCheckboxValue = (value: any, fallback?: any): boolean => {
    const source = value !== undefined ? value : fallback;
    if (source === undefined || source === null) return false;
    if (typeof source === "boolean") return source;
    if (typeof source === "number") return source === 1;
    if (typeof source === "string") {
        const lowered = source.trim().toLowerCase();
        return (
            lowered === "true" ||
            lowered === "t" ||
            lowered === "1" ||
            lowered === "y"
        );
    }
    return false;
};

export const parseRoleSource = (source: string): string[] => {
    if (source?.startsWith("user-role:")) {
        return source
            .slice(10)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    }
    return [];
};

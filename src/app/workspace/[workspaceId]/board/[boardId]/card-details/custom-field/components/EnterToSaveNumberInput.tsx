import { Input } from "antd";
import { useParams } from "next/navigation";
import SplitJobSlider from "@components/split-job/SplitJobSlider";
import { useCardDetailContext } from "@providers/card-detail-context";
import { useEnterToSave } from "../hooks/useEnterToSave";
import { formatCustomFieldNumberValue, sanitizeCustomFieldNumber } from "../utils";

interface EnterToSaveNumberInputProps {
    placeholder?: string;
    initialValue: number | undefined | null;
    onSave: (value: number | null) => void;
    className?: string;
    fieldName?: string;
    customFieldId?: string;
    disabled?: boolean;
    onSplitJobsSaved?: () => void;
    isSuperAdmin?: boolean;
}

export const EnterToSaveNumberInput: React.FC<EnterToSaveNumberInputProps> = ({
    placeholder,
    initialValue,
    onSave,
    className,
    fieldName,
    customFieldId,
    disabled = false,
    onSplitJobsSaved,
    isSuperAdmin,
}) => {
    const params = useParams();
    const { selectedCard } = useCardDetailContext();
    const cardId = selectedCard?.id || "";
    const { value, hasChanges, onChange, onKeyPress, onBlur } = useEnterToSave(
        formatCustomFieldNumberValue(initialValue),
        (stringValue) => {
            const numValue = sanitizeCustomFieldNumber(stringValue);
            onSave(numValue);
        },
        { saveOnBlur: true }
    );

    const normalizedFieldName = fieldName
        ?.normalize("NFKD")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    const numericValue = sanitizeCustomFieldNumber(value) ?? 0;
    const showSplitJob =
        normalizedFieldName === "jml produksi" &&
        Number.isFinite(numericValue) &&
        numericValue > 0;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const allowedKeys = [
            "Backspace", "Delete", "Tab", "Escape", "Enter",
            "Home", "End", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
        ];

        if (e.ctrlKey && ["a", "c", "v", "x", "z"].includes(e.key.toLowerCase())) {
            return;
        }
        if (allowedKeys.includes(e.key)) return;
        if (e.key >= "0" && e.key <= "9") return;
        if (e.key === "." && !value.includes(".")) return;
        if (e.key === "-" && value.length === 0) return;

        e.preventDefault();
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData("text");
        const cleanedText = pastedText.replace(/[^0-9.-]/g, "");
        const parts = cleanedText.split(".");
        const finalText =
            parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : cleanedText;

        const minusCount = (finalText.match(/-/g) || []).length;
        if (minusCount > 1 || (finalText.includes("-") && !finalText.startsWith("-"))) {
            const withoutMinus = finalText.replace(/-/g, "");
            onChange(finalText.startsWith("-") ? "-" + withoutMinus : withoutMinus);
        } else {
            onChange(finalText);
        }
    };

    return (
        <div className="relative">
            <Input
                type="text"
                placeholder={placeholder}
                className={`${className} ${hasChanges ? "border-blue-400" : ""}`}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyPress={onKeyPress}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onBlur={onBlur}
                disabled={disabled}
                suffix={
                    showSplitJob ? (
                    <SplitJobSlider
                        workspaceId={params.workspaceId as string}
                        customFieldId={customFieldId || ""}
                        cardId={cardId}
                        jmlValue={numericValue}
                        onSplitJobsSaved={onSplitJobsSaved}
                        isSuperAdmin={isSuperAdmin}
                    />
                ) : undefined
            }
        />
            {hasChanges && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <span className="text-xs text-blue-500 bg-white px-1">↵</span>
                </div>
            )}
        </div>
    );
};

import { Input } from "antd";
import { useEnterToSave } from "../hooks/useEnterToSave";

interface EnterToSaveInputProps {
    placeholder?: string;
    initialValue: string;
    onSave: (value: string) => void;
    className?: string;
    type?: string;
    disabled?: boolean;
}

export const EnterToSaveInput: React.FC<EnterToSaveInputProps> = ({
    placeholder,
    initialValue,
    onSave,
    className,
    type = "text",
    disabled = false,
}) => {
    const { value, hasChanges, onChange, onKeyPress, onBlur } = useEnterToSave(
        initialValue,
        onSave,
        { saveOnBlur: true }
    );

    return (
        <div className="relative">
            <Input
                type={type}
                placeholder={placeholder}
                className={`${className} ${hasChanges ? "border-blue-400" : ""}`}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyPress={onKeyPress}
                onBlur={onBlur}
                disabled={disabled}
            />
            {hasChanges && (
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <span className="text-xs text-blue-500 bg-white px-1">↵</span>
                </div>
            )}
        </div>
    );
};

import { AutoComplete } from "antd";
import { useState } from "react";

interface OptionAutoCompleteProps {
    options: { label: string; value: string }[];
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export const OptionAutoComplete: React.FC<OptionAutoCompleteProps> = ({
    options,
    value,
    onChange,
    placeholder,
    disabled = false,
    className = "",
}) => {
    const [searchText, setSearchText] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    const selectedOption = options.find((opt) => opt.value === value);
    const displayValue = isOpen ? searchText : (selectedOption?.label || "");

    const filteredOptions = options.filter((opt) => {
        if (!searchText) return true;
        return opt.label.toLowerCase().includes(searchText.toLowerCase());
    });

    const handleSelect = (selectedValue: string) => {
        onChange(selectedValue);
        setSearchText("");
        setIsOpen(false);
    };

    const handleSearch = (text: string) => {
        setSearchText(text);
    };

    const handleFocus = () => {
        setIsOpen(true);
        setSearchText("");
    };

    const handleBlur = () => {
        setTimeout(() => {
            setIsOpen(false);
            setSearchText("");
        }, 200);
    };

    return (
        <AutoComplete
            className={`w-full ${className}`}
            value={displayValue}
            options={filteredOptions.map((opt) => ({
                value: opt.value,
                label: opt.label,
            }))}
            onSelect={handleSelect}
            onSearch={handleSearch}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            allowClear
            onClear={() => {
                onChange("__CLEAR__");
                setSearchText("");
            }}
            filterOption={false}
        />
    );
};

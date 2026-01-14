import { Checkbox } from "antd";
import { useState, useEffect } from "react";

interface OptimisticCheckboxProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}

/**
 * Checkbox with optimistic UI updates for instant "butter" feel.
 * Toggles immediately on click while sync happens in background.
 */
export const OptimisticCheckbox: React.FC<OptimisticCheckboxProps> = ({
    checked,
    onChange,
    disabled,
}) => {
    const [localChecked, setLocalChecked] = useState(checked);

    useEffect(() => {
        setLocalChecked(checked);
    }, [checked]);

    const handleChange = (e: import("antd/es/checkbox").CheckboxChangeEvent) => {
        if (disabled) return;
        const newValue = e.target.checked;
        setLocalChecked(newValue);
        onChange(newValue);
    };

    return (
        <Checkbox
            checked={localChecked}
            onChange={handleChange}
            disabled={disabled}
        />
    );
};

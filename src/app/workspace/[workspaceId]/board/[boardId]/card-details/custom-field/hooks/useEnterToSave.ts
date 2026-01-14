import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Custom hook for Enter-to-save functionality with save-on-unmount support.
 * Ensures pending changes are persisted even if the component unmounts abruptly.
 */
export function useEnterToSave<T>(
    initialValue: T,
    onSave: (value: T) => void,
    options?: {
        saveOnBlur?: boolean;
    }
) {
    const [localValue, setLocalValue] = useState<T>(initialValue);
    const [hasChanges, setHasChanges] = useState(false);

    // Refs to track latest state for unmount handling
    const valueRef = useRef(localValue);
    const hasChangesRef = useRef(hasChanges);
    const onSaveRef = useRef(onSave);
    const saveOnBlurRef = useRef(options?.saveOnBlur);

    useEffect(() => {
        valueRef.current = localValue;
    }, [localValue]);

    useEffect(() => {
        hasChangesRef.current = hasChanges;
    }, [hasChanges]);

    useEffect(() => {
        onSaveRef.current = onSave;
    }, [onSave]);

    useEffect(() => {
        saveOnBlurRef.current = options?.saveOnBlur;
    }, [options?.saveOnBlur]);

    // Update local value when initial value changes externally
    useEffect(() => {
        setLocalValue(initialValue);
        setHasChanges(false);
    }, [initialValue]);

    const handleChange = (value: T) => {
        setLocalValue(value);
        setHasChanges(value !== initialValue);
    };

    const save = useCallback(() => {
        if (hasChangesRef.current) {
            onSaveRef.current(valueRef.current);
            setHasChanges(false);
            hasChangesRef.current = false;
        }
    }, []);

    // Save on unmount if there are unsaved changes
    useEffect(() => {
        return () => {
            if (hasChangesRef.current) {
                save();
            }
        };
    }, [save]);

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            save();
        }
    };

    const handleBlur = () => {
        if (saveOnBlurRef.current) {
            save();
        }
    };

    const reset = () => {
        setLocalValue(initialValue);
        setHasChanges(false);
    };

    return {
        value: localValue,
        hasChanges,
        onChange: handleChange,
        onKeyPress: handleKeyPress,
        onBlur: handleBlur,
        save,
        reset,
    };
}

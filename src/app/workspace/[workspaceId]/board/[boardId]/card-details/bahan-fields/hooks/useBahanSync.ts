import { useCallback, useEffect, useRef } from "react";
import { POItem } from "../types";

interface UseBahanSyncProps {
    poData: POItem[];
    cardCustomFields: any[] | undefined;
    getCustomFieldNumberValue: ((fieldId: string) => number | null | undefined) | undefined;
    setCustomFieldNumberValue: (fieldId: string, value: number) => void;
}

interface LastSyncedTotals {
    terloading: number;
    terpakai: number | null;
}

/**
 * Hook that handles syncing Bahan totals to Card Custom Fields.
 * This isolates the side-effect logic from the data management and UI.
 *
 * Key behavior:
 * - Syncs "Bahan Terloading" custom field when terloading values change.
 * - Syncs "Bahan Terpakai" custom field ONLY when at least one product has a non-null value.
 *   If all products have null bahanTerpakai (user hasn't touched them), the custom field is NOT updated.
 */
export const useBahanSync = ({
    poData,
    cardCustomFields,
    getCustomFieldNumberValue,
    setCustomFieldNumberValue,
}: UseBahanSyncProps) => {
    const lastSyncedTotalsRef = useRef<LastSyncedTotals>({
        terloading: -1, // Use -1 to force initial sync
        terpakai: null,
    });

    // Calculate total terloading across all products
    const calculateTotalTerloading = useCallback((data: POItem[]): number => {
        return data.reduce((poAcc, po) => {
            const productTotal = (po.products || []).reduce((prodAcc, product) => {
                const terloadingValue =
                    product.bahanTabs?.[0]?.terloading ?? 0;
                const numericValue = Number(terloadingValue);
                return prodAcc + (Number.isFinite(numericValue) ? numericValue : 0);
            }, 0);
            return poAcc + productTotal;
        }, 0);
    }, []);

    // Calculate total bahan terpakai, with awareness of null values
    const calculateTotalBahanTerpakai = useCallback(
        (data: POItem[]): { total: number; hasAnyNonNullValue: boolean } => {
            let hasAnyNonNullValue = false;
            let total = 0;

            data.forEach((po) => {
                (po.products || []).forEach((product) => {
                    const rawValue = product.bahanTabs?.[0]?.bahanTerpakai;
                    if (rawValue !== null && rawValue !== undefined) {
                        hasAnyNonNullValue = true;
                        const numericValue = Number(rawValue);
                        if (Number.isFinite(numericValue)) {
                            total += numericValue;
                        }
                    }
                });
            });

            return { total, hasAnyNonNullValue };
        },
        []
    );

    // Find custom field by name
    const findFieldByName = useCallback(
        (needle: string) => {
            if (!cardCustomFields) return undefined;
            return cardCustomFields.find((field: any) =>
                (field.name || "").toLowerCase().includes(needle)
            );
        },
        [cardCustomFields]
    );

    // Sync terloading to custom field
    const syncTerloadingToCustomField = useCallback(
        (data: POItem[]) => {
            if (!cardCustomFields || cardCustomFields.length === 0) return;

            const totalTerloading = calculateTotalTerloading(data);

            // Skip if value hasn't changed
            if (lastSyncedTotalsRef.current.terloading === totalTerloading) {
                return;
            }

            const terloadingField = findFieldByName("bahan terloading");
            if (terloadingField?.id) {
                const existing = Number(getCustomFieldNumberValue?.(terloadingField.id) ?? 0);
                if (!Number.isFinite(existing) || existing !== totalTerloading) {
                    setCustomFieldNumberValue(terloadingField.id, totalTerloading);
                }
            }

            lastSyncedTotalsRef.current.terloading = totalTerloading;
        },
        [
            cardCustomFields,
            calculateTotalTerloading,
            findFieldByName,
            getCustomFieldNumberValue,
            setCustomFieldNumberValue,
        ]
    );

    // Sync bahan terpakai to custom field (only if any non-null values exist)
    const syncTerpakaiToCustomField = useCallback(
        (data: POItem[]) => {
            if (!cardCustomFields || cardCustomFields.length === 0) return;

            const { total: totalBahanTerpakai, hasAnyNonNullValue } =
                calculateTotalBahanTerpakai(data);

            // Skip sync entirely if no products have been touched (all null)
            if (!hasAnyNonNullValue) {
                return;
            }

            // Skip if value hasn't changed
            if (lastSyncedTotalsRef.current.terpakai === totalBahanTerpakai) {
                return;
            }

            const terpakaiField = findFieldByName("bahan terpakai");
            if (terpakaiField?.id) {
                const existing = Number(getCustomFieldNumberValue?.(terpakaiField.id) ?? 0);
                if (!Number.isFinite(existing) || existing !== totalBahanTerpakai) {
                    setCustomFieldNumberValue(terpakaiField.id, totalBahanTerpakai);
                }
            }

            lastSyncedTotalsRef.current.terpakai = totalBahanTerpakai;
        },
        [
            cardCustomFields,
            calculateTotalBahanTerpakai,
            findFieldByName,
            getCustomFieldNumberValue,
            setCustomFieldNumberValue,
        ]
    );

    // Combined sync function
    const syncAllToCustomFields = useCallback(
        (data: POItem[]) => {
            syncTerloadingToCustomField(data);
            syncTerpakaiToCustomField(data);
        },
        [syncTerloadingToCustomField, syncTerpakaiToCustomField]
    );

    // Auto-sync when poData changes
    useEffect(() => {
        if (poData.length > 0 && cardCustomFields && cardCustomFields.length > 0) {
            syncAllToCustomFields(poData);
        }
    }, [poData, cardCustomFields, syncAllToCustomFields]);

    return {
        syncTerloadingToCustomField,
        syncTerpakaiToCustomField,
        syncAllToCustomFields,
        calculateTotalTerloading,
        calculateTotalBahanTerpakai,
    };
};

export default useBahanSync;

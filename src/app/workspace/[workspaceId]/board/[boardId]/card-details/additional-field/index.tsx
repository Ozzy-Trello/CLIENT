import { getItemDetail } from "@api/accurate";
import {
  useCardAdditionalFields,
  useCreateAdditionalField,
  useUpdateAdditionalField,
  useUpdateAdditionalFieldItem,
} from "@hooks/additional-field";
import { useCardDetailContext } from "@providers/card-detail-context";
import type { AdditionalFieldItem } from "@myTypes/additional-field";
import { useQuery } from "@tanstack/react-query";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Tabs } from "antd";
import { useEffect, useState } from "react";

// --- Calculation utility functions ---

/**
 * Est Bahan (Estimated Material)
 * Formula (provided by user):
 * (
 *   (Polo TPD / 3.15) +
 *   (Polo TPJ / 2.6) +
 *   (Polo TNK / 1.95) +
 *   (Oblong TPD / 4.35) +
 *   (Oblong TPJ / 3.65) +
 *   (Oblong TNK / 3) +
 *   (Total Jml Hoodie / 1.33) +
 *   (Kemeja TPD * 1.3) +
 *   (Kemeja TPJ * 1.5) +
 *   (Total Jml Jaket * 1.5) +
 *   (Total Jml Rompi * 1.2) +
 *   (Total Jml Celana * 1.2) +
 *   (Total Jml Apron * 1.5) +
 *   (Total Jml Jersey / 4)
 * )
 *
 * Each field is taken from item.additionalFields (per tabKey/fieldKey conventions)
 */
function calculateEstBahan(item: ItemDetail): number {
  if (!item.additionalFields) return 0;

  const get = (tab: string, field: string): number => {
    // Ensure the value is a valid number with 3 decimal places
    return parseFloat(
      Number(item.additionalFields?.[tab]?.[field] ?? 0).toFixed(2)
    );
  };

  const result =
    get("1", "poloTpd") / 3.15 +
    get("1", "poloTpj") / 2.6 +
    get("1", "poloTpk") / 1.95 +
    get("2", "oblongTpd") / 4.35 +
    get("2", "oblongTpj") / 3.65 +
    get("2", "oblongTpk") / 3 +
    get("5", "hoodieTotal") / 1.33 +
    get("3", "kemejaTpd") * 1.3 +
    get("3", "kemejaTpj") * 1.5 +
    get("4", "jaketTotal") * 1.5 +
    get("7", "rompiTotal") * 1.2 +
    get("6", "celanaTotal") * 1.2 +
    get("14", "apronTotal") * 1.5 +
    get("9", "jerseyTotal") / 4;

  // Return the result with exactly 3 decimal places
  return parseFloat(result.toFixed(2));
}

/**
 * Bahan Terpakai (Material Used)
 * Formula: Bahan Terpakai = usedAmount
 * - usedAmount: The actual amount of material used for this item (from Accurate)
 */
function calculateBahanTerpakai(item: ItemDetail): number {
  return Number((item.usedAmount || 0) - (item.remainingAmount || 0)) || 0;
}

/**
 * Efisiensi (Efficiency)
 * Formula: Efisiensi = ((Est Bahan - Bahan Terpakai) / Est Bahan) * 100
 * - Est Bahan: Estimated material needed (see above)
 * - Bahan Terpakai: Actual material used (see above)
 * - Returns efficiency as a percentage (0 if Est Bahan is 0)
 */
function calculateEfisiensi(item: ItemDetail): number {
  const estBahan = calculateEstBahan(item);
  return parseFloat((estBahan - (item.remainingAmount || 0)).toFixed(2));
}

interface AdditionalTab {
  key: string;
  fields: Record<string, any>;
  label: string;
}
const tabNames: AdditionalTab[] = [
  {
    key: "1",
    label: "Polo",
    fields: {
      poloTpj: {
        label: "Polo TPJ",
        value: 0,
      },
      poloTpk: {
        label: "Polo TPK",
        value: 0,
      },
      poloTpd: {
        label: "Polo TPD",
        value: 0,
      },
      poloTotal: {
        label: "Total Polo",
        value: 0,
      },
    },
  },
  {
    key: "2",
    label: "Oblong",
    fields: {
      oblongTpj: {
        label: "Oblong TPJ",
        value: 0,
      },
      oblongTpk: {
        label: "Oblong TPK",
        value: 0,
      },
      oblongTpd: {
        label: "Oblong TPD",
        value: 0,
      },
      oblongTotal: {
        label: "Total Oblong",
        value: 0,
      },
    },
  },
  {
    key: "3",
    label: "Kemeja",
    fields: {
      kemejaTpj: {
        label: "Kemeja TPJ",
        value: 0,
      },
      kemejaTpd: {
        label: "Kemeja TPD",
        value: 0,
      },
      kemejaTotal: {
        label: "Total Kemeja",
        value: 0,
      },
    },
  },
  {
    key: "4",
    label: "Jaket",
    fields: {
      jaket: {
        label: "Total Jaket",
        value: 0,
      },
    },
  },
  {
    key: "5",
    label: "Hoodie",
    fields: { hoodie: { label: "Total Hoodie", value: 0 } },
  },
  {
    key: "6",
    label: "Celana",
    fields: { celana: { label: "Total Celana", value: 0 } },
  },
  {
    key: "7",
    label: "Rompi",
    fields: { rompi: { label: "Total Rompi", value: 0 } },
  },
  {
    key: "8",
    label: "Jersey",
    fields: { jersey: { label: "Total Jersey", value: 0 } },
  },
  {
    key: "9",
    label: "Apron",
    fields: { apron: { label: "Total Apron", value: 0 } },
  },
  {
    key: "10",
    label: "Topi",
    fields: { topi: { label: "Total Topi", value: 0 } },
  },
];

const baseInputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-4 text-xs py-2 text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-blue-200 transition placeholder-gray-400 shadow-none appearance-none";
const labelClass =
  "block text-[15px] font-medium text-gray-800 mb-1 flex items-center gap-2";
const sectionTitleClass =
  "text-[20px] font-semibold text-gray-900 mb-2 flex items-center gap-2";

// Using the type from our types file instead of local interface
type ItemDetail = AdditionalFieldItem;

const AdditionalFields: React.FC = () => {
  const { selectedCard } = useCardDetailContext();
  const cardId: string = selectedCard?.id || "";

  const [scannedItems, setScannedItems] = useState<ItemDetail[]>([]);
  const [currentScannedId, setCurrentScannedId] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [additionalFieldId, setAdditionalFieldId] = useState<string | null>(
    null
  );

  const { data: additionalFieldData } = useCardAdditionalFields(cardId);

  const { data: itemDetail, error } = useQuery({
    queryKey: ["itemDetail", currentScannedId],
    queryFn: async () => {
      if (!currentScannedId) throw new Error("No scanned item ID");
      const response = await getItemDetail(currentScannedId);
      return response.data;
    },
    enabled: !!currentScannedId,
  });

  const createMutation = useCreateAdditionalField(cardId);

  const updateMutation = useUpdateAdditionalField(
    additionalFieldId || "",
    cardId
  );

  // Update specific item mutation
  const updateItemMutation = useUpdateAdditionalFieldItem(
    additionalFieldId || "",
    cardId
  );

  // Load existing data when component mounts
  useEffect(() => {
    console.log(additionalFieldData, "<< in iisinya apa");
    if (additionalFieldData && additionalFieldData.length > 0) {
      const existingData = additionalFieldData[0];
      setAdditionalFieldId(existingData.id);
      setScannedItems(JSON.parse(existingData.data) || []);
    }
  }, [additionalFieldData]);

  // Handle new scanned items
  useEffect(() => {
    if (itemDetail && currentScannedId) {
      const initialFields: Record<string, Record<string, number>> = {};
      tabNames.forEach((tab) => {
        initialFields[tab.key] = {};
        Object.keys(tab.fields).forEach((fieldKey) => {
          initialFields[tab.key][fieldKey] = 0;
        });
      });

      const newItem = {
        id: currentScannedId,
        name: itemDetail.name,
        color: itemDetail.color,
        variant: itemDetail.variant,
        pattern: itemDetail.pattern,
        remainingAmount: itemDetail.remainingAmount,
        usedAmount: itemDetail.usedAmount,
        estimatedProduction: itemDetail.estimatedProduction,
        additionalFields: initialFields,
      };

      const updatedItems = [...scannedItems, newItem];
      setScannedItems(updatedItems);

      // Save to database
      if (additionalFieldId) {
        // Update existing record
        updateMutation.mutate(updatedItems);
      } else {
        // Create new record
        createMutation.mutate(updatedItems);
      }

      setCurrentScannedId(null);
    }
  }, [itemDetail, currentScannedId, additionalFieldId, cardId]);

  const handleFieldChange = (
    itemIndex: number,
    tabKey: string,
    fieldKey: string,
    value: string
  ) => {
    const updatedItems = [...scannedItems];
    // Accept comma or dot as decimal separator
    const numericValue = parseFloat(value.replace(",", "."));
    // Store raw string for editing (only for these fields)
    if (!updatedItems[itemIndex].__rawInputs)
      updatedItems[itemIndex].__rawInputs = {};
    updatedItems[itemIndex].__rawInputs[`${tabKey}.${fieldKey}`] = value;

    // Update nested additionalFields
    if (updatedItems[itemIndex].additionalFields) {
      updatedItems[itemIndex].additionalFields[tabKey] = {
        ...updatedItems[itemIndex].additionalFields[tabKey],
        [fieldKey]: numericValue,
      };
    }

    // Special handling for Terloading (usedAmount) and Sisa Bahan (remainingAmount)
    if (
      (tabKey === "materialUsage" && fieldKey === "bahanTerpakai") ||
      (tabKey === "materialUsage" && fieldKey === "usedAmount")
    ) {
      updatedItems[itemIndex].usedAmount = numericValue;
    }
    if (
      (tabKey === "remainingAmount" && fieldKey === "remainingAmount") ||
      (tabKey === "materialUsage" && fieldKey === "sisaBahan")
    ) {
      updatedItems[itemIndex].remainingAmount = numericValue;
    }

    // Update total fields for tabs < 4
    tabNames.forEach((tab) => {
      if (tab.key === tabKey) {
        Object.keys(tab.fields).forEach((key) => {
          if (key.toLowerCase().includes("total") && +tab.key < 4) {
            updatedItems[itemIndex].additionalFields[tabKey][key] =
              calculateTotalForField(tabKey, key, itemIndex);
          }
        });
      }
    });

    setScannedItems(updatedItems);

    // Save to database
    if (additionalFieldId) {
      updateMutation.mutate(updatedItems);
    }
  };

  const handleScan = (codes: any) => {
    if (codes.length > 0) {
      const scannedId = codes[0].rawValue;
      setCurrentScannedId(scannedId);
      setShowScanner(false);
    }
  };

  const handleRemoveTab = (targetKey: string) => {
    const updatedItems = scannedItems.filter(
      (_, index) => String(index + 1) !== targetKey
    );
    setScannedItems(updatedItems);

    // Save to database
    if (additionalFieldId) {
      updateMutation.mutate(updatedItems);
    }
  };

  const handleSave = () => {
    const dataToSave = scannedItems.map((item, index) => {
      // First, update the total values in the additionalFields
      const updatedAdditionalFields = { ...item.additionalFields };

      // Calculate and update all total fields
      tabNames.forEach((tab) => {
        Object.keys(tab.fields).forEach((fieldKey) => {
          // check if the key is less than 4
          if (fieldKey.toLowerCase().includes("total") && +tab.key < 4) {
            // Update the total value in additionalFields
            if (updatedAdditionalFields && updatedAdditionalFields[tab.key]) {
              updatedAdditionalFields[tab.key][fieldKey] =
                calculateTotalForField(tab.key, fieldKey, index);
            }
          }
        });
      });

      // Now create the fields array with updated values
      const updatedFields = tabNames.map((tab) => ({
        key: tab.key,
        label: tab.label,
        fields: Object.entries(tab.fields).reduce((acc, [fieldKey, field]) => {
          const isTotalField = fieldKey.toLowerCase().includes("total");
          const value = isTotalField
            ? calculateTotalForField(tab.key, fieldKey, index)
            : item.additionalFields?.[tab.key]?.[fieldKey] || 0;

          acc[fieldKey as keyof typeof tab.fields] = {
            label: field.label,
            value: value,
          };
          return acc;
        }, {} as typeof tab.fields),
      }));

      return {
        ...item,
        additionalFields: updatedAdditionalFields,
        fields: updatedFields,
      };
    });

    console.log(JSON.stringify(dataToSave, null, 2)); // Save the data in JSON format (you can replace this with an API call to save the data)
  };

  const calculateTotalForField = (
    tabKey: string,
    fieldKey: string,
    itemIndex: number
  ): number => {
    // Get the current tab's fields
    const currentTab = tabNames.find((tab) => tab.key === tabKey);
    if (!currentTab) return 0;

    // Get all non-total field keys for this tab
    const nonTotalFieldKeys = Object.keys(currentTab.fields).filter(
      (key) => !key.toLowerCase().includes("total")
    );

    // Sum up all non-total fields for this item in this tab
    return nonTotalFieldKeys.reduce((sum, key) => {
      const value =
        scannedItems[itemIndex].additionalFields?.[tabKey]?.[key] || 0;
      return sum + Number(value);
    }, 0);
  };

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center justify-center text-gray-700">
          <svg
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <rect x="5" y="5" width="14" height="14" rx="2"></rect>
            <path d="M9 9h6v6H9z"></path>
          </svg>
        </span>
        <span className="text-[18px] font-semibold text-gray-900">Bahan</span>
      </div>
      <div className="ml-8 grid grid-cols-3 gap-x-6 gap-y-3 mb-3">
        <div>
          <label className={labelClass}>Produk</label>
          <input className={baseInputClass} readOnly />
        </div>
      </div>
      <div className="ml-8">
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          className="mb-2 px-3 py-1 rounded border border-gray-200 bg-white text-gray-700 text-xs font-medium"
        >
          SCAN BAHAN
        </button>

        {error && (
          <div className="text-red-600 text-xs mt-2">
            {(error as Error).message}
          </div>
        )}

        <Tabs
          type="editable-card"
          hideAdd
          onEdit={(targetKey, action) => {
            if (action === "remove") {
              handleRemoveTab(targetKey as string);
            }
          }}
          items={scannedItems.map((item, index) => ({
            key: String(index + 1),
            label: (
              <span className="flex justify-between items-center">
                {item.name}
              </span>
            ),
            tabKey: String(index + 1),
            children: (
              <div>
                <div className={sectionTitleClass}>Detail Produk</div>

                <div className="grid grid-cols-3 gap-x-6 gap-y-3 mb-3">
                  <div>
                    <label className={labelClass}>Warna</label>
                    <input
                      className={baseInputClass}
                      value={item.name || ""}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Varian</label>
                    <input
                      className={baseInputClass}
                      value={item.variant || ""}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Variasi Pola</label>
                    <input
                      className={baseInputClass}
                      value={item.pattern || ""}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-x-6 gap-y-3 mb-3">
                  <div>
                    <label className={labelClass}>Terloading (kg/m)</label>
                    <input
                      className={baseInputClass}
                      value={
                        item.__rawInputs?.["materialUsage.bahanTerpakai"] ??
                        item.additionalFields?.materialUsage?.bahanTerpakai ??
                        item.usedAmount ??
                        ""
                      }
                      onChange={(e) => {
                        // cannot pass if its alphabetical
                        if (!isNaN(Number(e.target.value))) {
                          handleFieldChange(
                            index,
                            "materialUsage",
                            "bahanTerpakai",
                            e.target.value
                          );
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Sisa Bahan (kg/m)</label>
                    <input
                      className={baseInputClass}
                      value={
                        item.__rawInputs?.["remainingAmount.remainingAmount"] ??
                        item.additionalFields?.remainingAmount
                          ?.remainingAmount ??
                        item.remainingAmount ??
                        ""
                      }
                      onChange={(e) => {
                        // cannot pass if its alphabetical
                        if (!isNaN(Number(e.target.value))) {
                          handleFieldChange(
                            index,
                            "remainingAmount",
                            "remainingAmount",
                            e.target.value
                          );
                        }
                      }}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Jml. Produksi (+/-)</label>
                    <input
                      className={baseInputClass}
                      // value={
                      //   (item.usedAmount || 0) - (item.remainingAmount || 0)
                      // }
                      readOnly
                    />
                  </div>
                </div>

                <div>
                  <div className={sectionTitleClass}>Penggunaan Kain</div>

                  <div className="grid grid-cols-3 gap-x-4 gap-y-3">
                    <div>
                      <label className={labelClass}>Est. Bahan</label>
                      <input
                        className={baseInputClass}
                        value={calculateEstBahan(item)}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Bahan Terpakai</label>
                      <input
                        className={baseInputClass}
                        value={calculateBahanTerpakai(item)}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Efisiensi</label>
                      <input
                        className={baseInputClass}
                        value={calculateEfisiensi(item)}
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <Tabs
                    tabPosition="top"
                    tabBarGutter={10}
                    items={tabNames.map((tab) => ({
                      key: tab.key,
                      label: tab.label,
                      children: (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                          {Object.entries(tab.fields).map(
                            ([fieldKey, field]) => {
                              const isTotalField = fieldKey
                                .toLowerCase()
                                .includes("total");
                              const fieldValue = isTotalField
                                ? calculateTotalForField(
                                    tab.key,
                                    fieldKey,
                                    index
                                  )
                                : scannedItems[index].additionalFields?.[
                                    tab.key
                                  ]?.[fieldKey] ?? "";

                              return (
                                <div key={fieldKey}>
                                  <label className={labelClass}>
                                    {field.label}
                                  </label>
                                  <input
                                    className={baseInputClass}
                                    placeholder="0"
                                    value={fieldValue}
                                    disabled={isTotalField}
                                    readOnly={isTotalField}
                                    onChange={
                                      isTotalField
                                        ? undefined
                                        : (e) =>
                                            handleFieldChange(
                                              index,
                                              tab.key,
                                              fieldKey,
                                              e.target.value
                                            )
                                    }
                                  />
                                </div>
                              );
                            }
                          )}
                        </div>
                      ),
                    }))}
                  />
                </div>
              </div>
            ),
          }))}
        />
      </div>
      {/* Save button removed since data is saved automatically */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <Scanner
              onScan={handleScan}
              onError={() => setShowScanner(false)}
            />
            <button
              onClick={() => setShowScanner(false)}
              className="mt-2 px-4 py-1 rounded bg-gray-200 text-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdditionalFields;

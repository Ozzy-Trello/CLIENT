import { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Tabs, TabsProps } from "antd";

const tabNames: TabsProps["items"] = [
  { key: "1", label: "Polo" },
  { key: "2", label: "Oblong" },
  { key: "3", label: "Kemeja" },
  { key: "4", label: "Jaket" },
  { key: "5", label: "Hoodie" },
];

const baseInputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-4 text-xs py-2 text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-blue-200 transition placeholder-gray-400 shadow-none appearance-none";
const labelClass =
  "block text-[15px] font-medium text-gray-800 mb-1 flex items-center gap-2";
const sectionTitleClass =
  "text-[20px] font-semibold text-gray-900 mb-2 mt-8 flex items-center gap-2";

const AdditionalFields: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  return (
    <div className="mt-8">
      {/* Top Row */}
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
        <span className="text-[18px] font-semibold text-gray-900">
          Data Field
        </span>
      </div>

      <div className="ml-8">
        <div className={sectionTitleClass}>Detail Produk</div>
        <div className="grid grid-cols-3 gap-x-6 gap-y-3 mb-3">
          <div>
            <label className={labelClass}>Produk</label>
            <input className={baseInputClass} placeholder="" />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          className="mb-2 px-3 py-1 rounded border border-gray-200 bg-white text-gray-700 text-xs font-medium"
        >
          SCAN BAHAN
        </button>
        {scanResult && (
          <div className="text-green-600 text-xs mt-2">
            Scanned: {scanResult}
          </div>
        )}
        <div className="grid grid-cols-3 gap-x-6 gap-y-3 mb-3">
          <div>
            <label className={labelClass}>Warna</label>
            <input className={baseInputClass} placeholder="0.00" />
          </div>
          <div>
            <label className={labelClass}>Varian</label>
            <input className={baseInputClass} placeholder="" />
          </div>
          <div>
            <label className={labelClass}>Variasi Pola</label>
            <input className={baseInputClass} placeholder="" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-x-6 gap-y-3 mb-3">
          <div>
            <label className={labelClass}> Terloading (kg/m)</label>
            <input className={baseInputClass} placeholder="" />
          </div>
          <div>
            <label className={labelClass}>Sisa Bahan (kg/m)</label>
            <input className={baseInputClass} placeholder="" />
          </div>
          <div>
            <label className={labelClass}>Jml. Produksi (+/-)</label>
            <input className={baseInputClass} placeholder="0.00" />
          </div>
        </div>
        {/* Tabs */}
      </div>

      {/* QR Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <Scanner
              onScan={(codes) => {
                console.log(codes, "<< IN ISI COFDES");
                if (codes.length > 0) {
                  setScanResult(codes[0].rawValue);
                  setShowScanner(false);
                }
              }}
              onError={(error) => {
                // alert("Camera error: " + (error?.message || error));
                setShowScanner(false);
              }}
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

      {/* Penggunaan Kain */}
      <div className="ml-8">
        <div className={sectionTitleClass}>Penggunaan Kain (kg/m)</div>
        <div className="grid grid-cols-3 gap-x-6 gap-y-3 mb-3">
          <div>
            <label className={labelClass}>Est. Bahan (kg/m)</label>
            <input className={baseInputClass} placeholder="0.00" />
          </div>
          <div>
            <label className={labelClass}>Terpakai (kg/m)</label>
            <input className={baseInputClass} placeholder="" />
          </div>
          <div>
            <label className={labelClass}>Efisiensi (+/-)</label>
            <input className={baseInputClass} placeholder="0.00" />
          </div>
        </div>
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-3">
          {/* {tabNames.map((tab, idx) => (
            <button
              key={tab}
              className={`px-4 py-1 rounded-lg font-semibold text-xs border border-gray-200 transition ${
                activeTab === idx
                  ? "bg-gray-100 text-gray-900 border-gray-300"
                  : "bg-white text-gray-500 hover:bg-gray-50"
              }`}
              onClick={() => setActiveTab(idx)}
            >
              {tab}
            </button>
          ))} */}
          <Tabs items={tabNames} />
        </div>
        {/* Tabbed Inputs */}
        <div className="grid grid-cols-3 gap-x-6 gap-y-3 mb-3">
          <div>
            <label className={labelClass}>Polo TPD</label>
            <input className={baseInputClass} placeholder="" />
          </div>
          <div>
            <label className={labelClass}>Polo TPJ</label>
            <input className={baseInputClass} placeholder="" />
          </div>
          <div>
            <label className={labelClass}>Polo TNK</label>
            <input className={baseInputClass} placeholder="" />
          </div>
          <div>
            <label className={labelClass}>Total Jml Polo</label>
            <input className={baseInputClass} placeholder="0" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdditionalFields;

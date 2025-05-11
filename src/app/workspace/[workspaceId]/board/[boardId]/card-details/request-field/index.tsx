import { CardRequest } from "@/app/dto/types";
import { Table } from "antd";
import { useCardDetailContext } from "@/app/provider/card-detail-context";

const tabNames = ["Polo", "Oblong", "Kemeja", "Jaket", "Hoodie"];

const baseInputClass =
  "w-full rounded-lg border border-gray-200 bg-white px-4 text-xs py-2 text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-blue-200 transition placeholder-gray-400 shadow-none appearance-none";
const labelClass =
  "block text-[15px] font-medium text-gray-800 mb-1 flex items-center gap-2";
const sectionTitleClass =
  "text-[20px] font-semibold text-gray-900 mb-2 mt-8 flex items-center gap-2";

const RequestFields: React.FC = () => {
  const { selectedCard } = useCardDetailContext();

  console.log('Selected Card:', selectedCard);
  console.log('Selected Card Requests:', selectedCard?.requests);
  console.log('Selected Card Keys:', selectedCard ? Object.keys(selectedCard) : []);

  const columns = [
    {
      title: "Item Name",
      dataIndex: "itemName",
      key: "itemName",
    },
    {
      title: "Request Amount",
      dataIndex: "requestAmount",
      key: "requestAmount",
    },
    {
      title: "Adjustment Name",
      dataIndex: "adjustmentName",
      key: "adjustmentName",
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
    },
  ];

  console.log(selectedCard, "<< ini selected");

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
            <path d="M12 4L4 20h16L12 4z" />
          </svg>
        </span>
        <span className="text-[18px] font-semibold text-gray-900">
          Requests
        </span>
      </div>
      <Table
        columns={columns}
        dataSource={selectedCard?.requests}
        pagination={false}
        size="small"
        className="ml-8"
      />
    </div>
  );
};

export default RequestFields;

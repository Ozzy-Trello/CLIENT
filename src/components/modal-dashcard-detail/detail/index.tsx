import { FC } from "react";
import { useCardDetailContext } from "@providers/card-detail-context";
import ShowFilter from "./filter/show";
import EditFilter from "./filter/edit";

const Detail: FC = () => {
  const { dashcardConfig, selectedCard, itemDashcard, openEditFilter } =
    useCardDetailContext();

  return (
    <div className="flex gap-3">
      <div className="flex flex-col gap-3">
        <div
          style={{
            backgroundColor: dashcardConfig?.backgroundColor || "#1890ff",
          }}
          className="w-60 h-40 rounded-lg flex items-center justify-center text-white font-bold text-xl relative"
        >
          {itemDashcard?.length || 0}
          <div className="absolute top-3 left-3 text-sm">Card</div>
          <div className="absolute bottom-3 left-3 text-sm">
            {selectedCard?.name}
          </div>
        </div>
      </div>

      {openEditFilter ? <EditFilter /> : <ShowFilter />}
    </div>
  );
};

export default Detail;

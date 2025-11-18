import UploadModal from "@components/modal-upload/modal-upload";
import { useCardAttachment } from "@hooks/card_attachment";
import { Card, CardAttachment, EnumAttachmentType } from "@myTypes/card";
import { FileUpload } from "@myTypes/file-upload";
import { Button, Modal } from "antd";
import { Folder } from "lucide-react";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Props {
  selectedCard: Card | null;
  isVisible: boolean;
  handleCancel?: () => void;
  setSelectedImageUrl: Dispatch<SetStateAction<string>>;
}

const CardAttachmentImageListModal: React.FC<Props> = ({
  selectedCard,
  isVisible,
  handleCancel,
  setSelectedImageUrl,
}) => {
  const params = useParams();
  const boardId = Array.isArray(params.boardId)
    ? params.boardId[0]
    : params.boardId;
  const listId =
    selectedCard?.listId || (selectedCard as any)?.list_id || "";
  const { cardAttachments, addAttachment } = useCardAttachment(
    selectedCard?.id || "",
    {
      listId,
      boardId,
    }
  );
  const [images, setImages] = useState<CardAttachment[]>([]);
  const [openUploadModal, setOpenUploadModal] = useState<boolean>(false);

  const handleUploadComplete = (file: File, result: FileUpload) => {
    addAttachment({
      cardId: selectedCard?.id || "",
      attachableType: EnumAttachmentType.File,
      attachableId: result.id,
      isCover: false,
    });
    setOpenUploadModal(false);
  };

  useEffect(() => {
    if (cardAttachments && cardAttachments?.length > 0) {
      const filtered = cardAttachments.filter((item: CardAttachment) =>
        item.file?.mimeType?.includes("image")
      );
      setImages(filtered);
    }
  }, [cardAttachments]);

  return (
    <Modal
      title={<span className="text-lg font-semibold">Select an Image</span>}
      open={isVisible}
      onCancel={handleCancel}
      width={600}
      footer={null}
      centered
    >
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 px-2 py-3">
        {images.length > 0 ? (
          images.map((item: CardAttachment) => (
            <div
              key={item.id}
              className="cursor-pointer rounded-lg overflow-hidden border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all"
              onClick={() => setSelectedImageUrl(item?.file?.url || "")}
            >
              <img
                src={item.file?.url}
                alt={item.file?.name}
                className="w-full h-28 object-cover hover:scale-105 transition-transform duration-200"
              />
            </div>
          ))
        ) : (
          <div className="col-span-full text-center text-gray-400 py-6">
            No images found.
          </div>
        )}
      </div>

      <div className="mt-4 px-2">
        <Button
          size="middle"
          type="dashed"
          className="w-full border-blue-500 text-blue-600 font-medium hover:bg-blue-50"
          onClick={() => setOpenUploadModal(true)}
        >
          <Folder size="14"/> Choose a file from your computer
        </Button>
      </div>

      <UploadModal
        isVisible={openUploadModal}
        onClose={() => setOpenUploadModal(false)}
        onUploadComplete={handleUploadComplete}
        uploadType="all"
        title="Upload File"
      />
    </Modal>
  );
};

export default CardAttachmentImageListModal;

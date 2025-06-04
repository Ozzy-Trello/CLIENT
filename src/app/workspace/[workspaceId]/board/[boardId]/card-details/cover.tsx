import UploadModal from "@components/modal-upload/modal-upload";
import { useCardAttachment } from "@hooks/card_attachment";
import { EnumAttachmentType, Card } from "@myTypes/card";
import { FileUpload } from "@myTypes/file-upload";
import { isImageFile } from "@utils/file";
import { Button, Image, Upload } from "antd";
import { useMemo, useState } from "react";

interface CoverProps {
  card: Card;
}

const Cover: React.FC<CoverProps> = (props) => {
  const { card } = props;
  const [openUploadModal, setOpenUploadmodal] = useState<boolean>(false);
  const { cardAttachments, addAttachment } = useCardAttachment(card.id);

  console.log({ cardAttachments });

  const handleCloseModal = () => {
    setOpenUploadmodal(false);
  };

  const handleOpenModal = () => {
    setOpenUploadmodal(true);
  };

  const handleUpload = (file: File, result: FileUpload) => {
    addAttachment({
      cardId: card.id,
      attachableType: EnumAttachmentType.File,
      attachableId: result.id,
      isCover: true,
    });
  };

  const imageCover = useMemo(() => {
    let url = "";

    if (card.cover) {
      url = card.cover;
      return url;
    }

    cardAttachments.forEach((item) => {
      if (item.file) {
        const isImage = isImageFile(item.file.name, item.file.mimeType);

        if (isImage) {
          url = item.file.url;
          return url;
        }
      }
    });

    return url;
  }, [cardAttachments, card]);

  return (
    <div className="relative bg-gray-300 bg-center bg-no-repeat h-36 flex justify-end items-end rounded-t-lg">
      {imageCover && (
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <Image
            src={imageCover}
            style={{
              objectFit: "cover",
              objectPosition: "center",
              display: "block",
            }}

            className="rounded-t-lg"
            height={144}
            width={"100%"}
            
          />
        </div>
      )}
      <Button
        icon={<Upload />}
        size="small"
        className="m-3 hover:bg-white/90 bg-white/80 shadow-sm border-0"
        onClick={handleOpenModal}
      >
        Cover
      </Button>

      <UploadModal
        isVisible={openUploadModal}
        onClose={handleCloseModal}
        onUploadComplete={handleUpload}
        uploadType="image"
        title="Upload Cover Image"
      />
    </div>
  );
};

export default Cover;

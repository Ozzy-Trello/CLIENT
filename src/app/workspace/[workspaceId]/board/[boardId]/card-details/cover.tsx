import UploadModal from "@/app/components/modal-upload/modal-upload";
import { Card, FileAttachment } from "@/app/dto/types";
import { useCardAttachment } from "@/app/hooks/card_attachment";
import { Button, Upload } from "antd";
import { useState } from "react";

interface CoverProps {
  card: Card;
}

const Cover: React.FC<CoverProps> = (props) => {

  const { card } = props;
  const [ openUploadModal, setOpenUploadmodal ] = useState<boolean>(false);
  const { addAttachment } = useCardAttachment(card.id);

  const handleCloseModal = () => {
    setOpenUploadmodal(false);
  }

  const handleOpenModal = () => {
    setOpenUploadmodal(true);
  }

  const handleUpload = (file: File, result: FileAttachment) => {
    addAttachment({
      cardId: card.id,
      fileId: result.id,
      isCover: true
    });
  }

  return (
    <div className="relative bg-gray-300 bg-center bg-no-repeat h-36 flex justify-end items-end rounded-t-lg"
      style={{
        backgroundImage: card.cover ? `url("${card.cover?.file?.url}")` : 'none',
        backgroundSize: 'contain'
      }}
    >
      <Button 
        icon={<Upload />} 
        size="small" 
        className="m-3 hover:bg-white/90 bg-white/80 shadow-sm border-0"
        onClick={() => {handleOpenModal()}}
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
  )
}

export default Cover;
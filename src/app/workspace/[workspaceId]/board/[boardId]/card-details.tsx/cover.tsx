import UploadModal from "@/app/components/modal-upload/modal-upload";
import { Card } from "@/app/dto/types";
import { Button, Upload } from "antd";
import { useState } from "react";

interface CoverProps {
  card: Card;
}

const Cover: React.FC<CoverProps> = (props) => {

  const { card } = props;
  const [ openUploadModal, setOpenUploadmodal ] = useState<boolean>(false);

  const handleCloseModal = () => {
    setOpenUploadmodal(false);
  }

  const handleOpenModal = () => {
    setOpenUploadmodal(true);
  }

  const handleUpload = (file: File) => {
    console.log("fle is: %o", file);
  }

  return (
    <div className="relative bg-gray-300 bg-center bg-no-repeat h-36 flex justify-end items-end rounded-t-lg"
      style={{
        backgroundImage: card.cover?.url ? `url("${card.cover.url}")` : 'none',
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
import { useEffect } from "react";

interface UseAttachmentInteractionsProps {
  cardId?: string;
  attachmentsRef: React.RefObject<HTMLDivElement>;
  openUploadModal: boolean;
  canUpdate: boolean;
  onFiles: (files: File[]) => Promise<void>;
  setIsDraggingOver: (isDragging: boolean) => void;
}

export const useAttachmentInteractions = ({
  cardId,
  attachmentsRef,
  openUploadModal,
  canUpdate,
  onFiles,
  setIsDraggingOver,
}: UseAttachmentInteractionsProps) => {
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (openUploadModal) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        await onFiles(files);
      }
    };

    const attachmentsElement = attachmentsRef.current;
    if (attachmentsElement) {
      attachmentsElement.addEventListener(
        "paste",
        handlePaste as unknown as EventListener
      );
    }

    document.addEventListener(
      "paste",
      handlePaste as unknown as EventListener
    );

    return () => {
      if (attachmentsElement) {
        attachmentsElement.removeEventListener(
          "paste",
          handlePaste as unknown as EventListener
        );
      }
      document.removeEventListener(
        "paste",
        handlePaste as unknown as EventListener
      );
    };
  }, [attachmentsRef, onFiles, openUploadModal, cardId]);

  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!canUpdate) {
        return;
      }

      dragCounter++;
      if (
        e.dataTransfer?.types.includes("Files") ||
        e.dataTransfer?.types.includes("application/x-moz-file")
      ) {
        setIsDraggingOver(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      dragCounter--;

      if (dragCounter === 0) {
        setIsDraggingOver(false);
      }
    };

    const handleFileDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      dragCounter = 0;
      setIsDraggingOver(false);
      if (!canUpdate) {
        return;
      }

      if (!e.dataTransfer) return;

      const files: File[] = [];

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          files.push(e.dataTransfer.files[i]);
        }

        if (files.length > 0) {
          await onFiles(files);
        }
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }
    };

    const dragEnterHandler = (e: Event) => handleDragEnter(e as DragEvent);
    const dragLeaveHandler = (e: Event) => handleDragLeave(e as DragEvent);
    const dropHandler = (e: Event) => handleFileDrop(e as DragEvent);
    const dragOverHandler = (e: Event) => handleDragOver(e as DragEvent);

    document.addEventListener("dragenter", dragEnterHandler);
    document.addEventListener("dragleave", dragLeaveHandler);
    document.addEventListener("drop", dropHandler);
    document.addEventListener("dragover", dragOverHandler);
    return () => {
      document.removeEventListener("dragenter", dragEnterHandler);
      document.removeEventListener("dragleave", dragLeaveHandler);
      document.removeEventListener("drop", dropHandler);
      document.removeEventListener("dragover", dragOverHandler);
    };
  }, [canUpdate, onFiles, setIsDraggingOver, cardId]);
};

import dynamic from "next/dynamic";
import React, { Dispatch, SetStateAction, forwardRef } from "react";
import "./style.css";
import { MentionUser } from "./mentions";

export { buildMentionSuggestions } from "./mentions";
export type { MentionUser } from "./mentions";

// Define the props interface here too so it's available for both components
export interface RichTextEditorProps {
  value?: string;
  initialValue?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  width?: string | number;
  minHeight?: string | number;
  maxHeight?: string | number;
  className?: string;
  readOnly?: boolean;
  workspaceId?: string;
  boardId?: string;
  mentionUsers?: MentionUser[];
  allowWorkspaceAllMention?: boolean;
  hasCustomImageSelector?: boolean;
  openCustomImagesSelector?: boolean;
  setOpenCustomImageSelector?: Dispatch<SetStateAction<boolean>>;
  selectedAttachmentImageUrl?: string;
  onImageUpload?: (file: File) => Promise<string>;
  transformReadOnlyHtml?: (html: string) => string;
}

export interface RichTextEditorHandle {
  insertMention: (id: string, value: string) => void;
  focus: () => void;
}

export const toCssSize = (value: string | number) =>
  typeof value === "number" ? `${value}px` : value;

export const getImageFile = (
  transfer: Pick<DataTransfer, "files" | "items">
) => {
  const file = Array.from(transfer.files || []).find((item) =>
    item.type.startsWith("image/")
  );
  if (file) return file;

  return Array.from(transfer.items || [])
    .find((item) => item.kind === "file" && item.type.startsWith("image/"))
    ?.getAsFile() || null;
};

export const sanitizeEditorImageUrl = (url: string) =>
  /^(?:https?:|data:image\/|blob:)/i.test(url) ? url : "//:0";

// Callers hold the picked attachment URL in state and never clear it, so the
// editor has to decide for itself whether a URL is a fresh pick or the same
// value surviving another render.
export const shouldInsertAttachmentImage = (
  selectedUrl: string | undefined,
  lastInsertedUrl: string | undefined
) => Boolean(selectedUrl) && selectedUrl !== lastInsertedUrl;

// Create a placeholder component to show while loading
const EditorPlaceholder: React.FC<{
  minHeight?: string | number;
  width?: string | number;
}> = ({ minHeight = "inherit", width = "100%" }) => {
  return (
    <div
      style={{
        minHeight: toCssSize(minHeight),
        width: toCssSize(width),
        backgroundColor: "#f9f9f9",
        border: "1px solid #d9d9d9",
        borderRadius: "4px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span style={{ color: "#bfbfbf" }}>Loading editor...</span>
    </div>
  );
};

// Import the component with SSR disabled
const RichTextEditorClient = dynamic<
  RichTextEditorProps & React.RefAttributes<RichTextEditorHandle>
>(
  () => import("./client").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <EditorPlaceholder />,
  }
);

const RichTextEditorWithRef = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  ({ minHeight = "100px", width = "100%", ...props }, ref) => (
    <div
      style={{
        minHeight: typeof minHeight === "number" ? `${minHeight}px` : minHeight,
        width: typeof width === "number" ? `${width}px` : width,
      }}
    >
      <RichTextEditorClient
        {...props}
        ref={ref}
        minHeight={minHeight}
        width="100%"
      />
    </div>
  )
);

export default RichTextEditorWithRef;

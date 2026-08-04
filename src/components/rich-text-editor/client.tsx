import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  Dispatch,
  SetStateAction,
  useImperativeHandle,
  forwardRef,
} from "react";
import ReactQuill from "react-quill";
import { message } from "antd";
import "react-quill/dist/quill.snow.css";
import "./mention.css";
import Quill from "quill";
import Mention from "quill-mention";
import { useAccountList } from "../../hooks/account";
import { Account } from "../../dto/account";
import { buildMentionSuggestions, MentionUser } from "./mentions";
import type { RichTextEditorHandle } from "./index";

const toCssSize = (value: string | number) =>
  typeof value === "number" ? `${value}px` : value;

// Register Quill modules once at module level
if (typeof window !== "undefined") {
  try {
    Quill.register("modules/mention", Mention, true);
  } catch (error) {
    console.warn("Quill mention module registration error:", error);
  }
}

// Move toolbar configuration outside component to prevent recreation
const toolbarConfig = [
  [{ header: [1, 2, false] }],
  ["bold", "italic", "underline", "strike", "blockquote"],
  [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
  ["link", "image"],
  ["clean"],
];

const formats = [
  "bold",
  "italic",
  "underline",
  "strike",
  "list",
  "bullet",
  "link",
  "image",
  "mention",
];

const readOnlyModules = { toolbar: false };

interface RichTextEditorProps {
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
}

const RichTextEditorClient = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  (
    {
      initialValue = "",
      value: controlledValue,
      onChange,
      placeholder = "comment..",
      width = "100%",
      minHeight = "100px",
      maxHeight = "400px",
      className = "",
      readOnly = false,
      hasCustomImageSelector = false,
      openCustomImagesSelector = false,
      setOpenCustomImageSelector,
      selectedAttachmentImageUrl,
      workspaceId,
      boardId,
      mentionUsers,
      allowWorkspaceAllMention = true,
    },
    ref
  ) => {
    const isControlled = controlledValue !== undefined;
    const [localValue, setLocalValue] = useState<string>(initialValue);
    const quillRef = useRef<ReactQuill>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const mentionAnchorIndexRef = useRef<number | null>(null);

    // Initialize modules object immediately
    const modulesRef = useRef<any>({
      toolbar: {
        container: toolbarConfig,
        handlers: {
          image: function () {
            if (setOpenCustomImageSelector) {
              console.log("Custom Quill image handler triggered");
              setOpenCustomImageSelector(true);
            }
          },
        },
      },
      clipboard: {
        matchVisual: false,
      },
      mention: {
        allowedChars: /^[A-Za-z0-9_.\-\sÅÄÖåäö]*$/,
        mentionDenotationChars: ["@"],
        blotName: "mention",
        onSelect: (
          item: any,
          insertItem: (data: any, programmaticInsert?: boolean) => void
        ) => {
          const mentionPayload = {
            id: item?.id || "",
            value: item?.value || "",
            denotationChar: item?.denotationChar || "@",
          };

          const editor = quillRef.current?.getEditor();
          const anchorIndex = mentionAnchorIndexRef.current;

          if (editor && typeof anchorIndex === "number" && anchorIndex >= 0) {
            const selection = editor.getSelection(true);
            const cursorIndex = selection?.index ?? anchorIndex + 1;
            const replaceLength = Math.max(cursorIndex - anchorIndex, 1);

            editor.deleteText(anchorIndex, replaceLength, "user");
            editor.insertEmbed(anchorIndex, "mention", mentionPayload, "user");
            editor.insertText(anchorIndex + 1, " ", "user");
            editor.setSelection(anchorIndex + 2, 0, "user");
            mentionAnchorIndexRef.current = null;
            return;
          }

          insertItem(mentionPayload, true);
        },
        source: (searchTerm: string, renderList: any) => {
          const editor = quillRef.current?.getEditor();
          const selection = editor?.getSelection();
          if (selection && selection.index >= searchTerm.length + 1) {
            mentionAnchorIndexRef.current =
              selection.index - searchTerm.length - 1;
          }

          console.log("Default mention source called");
          renderList([], searchTerm); // Default empty function
        },
      },
    });

    // Fetch account list only if workspaceId and boardId are provided
    const { data: accountListResponse } = useAccountList({
      workspaceId: workspaceId || "",
      boardId: boardId || "",
    });

    const accountList = accountListResponse?.data || [];

    useEffect(() => {
      if (!isControlled) setLocalValue(initialValue);
    }, [initialValue, isControlled]);

    // Create mention source function that uses current accountList
    const mentionSource = useCallback(
      (
        searchTerm: string,
        renderList: (matches: any[], searchTerm: string) => void
      ) => {
        console.log(
          "Mention source called with:",
          searchTerm,
          "accountList:",
          accountList
        );

        const normalizedSearch = (searchTerm || "").toLowerCase();

        const users = mentionUsers ?? accountList.map((account: Account) => account);
        const suggestions = buildMentionSuggestions(
          users,
          normalizedSearch,
          allowWorkspaceAllMention && Boolean(workspaceId || mentionUsers)
        );

        const editor = quillRef.current?.getEditor();
        const selection = editor?.getSelection();
        if (selection && selection.index >= searchTerm.length + 1) {
          mentionAnchorIndexRef.current = selection.index - searchTerm.length - 1;
        }

        renderList(suggestions, searchTerm);
      },
      [accountList, allowWorkspaceAllMention, mentionUsers, workspaceId]
    );

    // Update mention source when accountList changes
    useEffect(() => {
      if (modulesRef.current && modulesRef.current.mention) {
        modulesRef.current.mention.source = mentionSource;

        // Also update the mention module in the editor if it exists
        const editor = quillRef.current?.getEditor();
        if (editor) {
          const mentionModule = editor.getModule("mention");
          if (mentionModule && mentionModule.options) {
            mentionModule.options.source = mentionSource;
            console.log("Updated mention module source");
          }
        }
      }
    }, [mentionSource]);

    // Handle image paste
    useEffect(() => {
      if (readOnly || !containerRef.current) return;

      const pasteHandler = (e: ClipboardEvent) => {
        if (!e.clipboardData || !e.clipboardData.items) return;

        let imageFound = false;

        Array.from(e.clipboardData.items).forEach((item) => {
          if (item.type.indexOf("image") !== -1) {
            imageFound = true;
            e.preventDefault();

            const file = item.getAsFile();
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
              if (!event.target?.result) return;

              const imageUrl = event.target.result as string;

              // Insert image into editor
              const quillEditor = quillRef.current?.getEditor();
              if (quillEditor) {
                const range = quillEditor.getSelection() || {
                  index: quillEditor.getLength(),
                  length: 0,
                };
                quillEditor.insertEmbed(range.index, "image", imageUrl);

                // Move cursor after image
                quillEditor.setSelection(range.index + 1, 0);

                // Update React state
                const updatedContent = quillEditor.root.innerHTML;
                if (!isControlled) setLocalValue(updatedContent);
                if (onChange) onChange(updatedContent);

                message.success("Image added");
              }
            };
            reader.readAsDataURL(file);
          }
        });
      };

      containerRef.current.addEventListener("paste", pasteHandler);
      return () => {
        containerRef.current?.removeEventListener("paste", pasteHandler);
      };
    }, [isControlled, readOnly, onChange]);

    const handleChange = (content: string) => {
      if (!isControlled) setLocalValue(content);
      if (onChange) {
        onChange(content);
      }
    };

    const handleMentionModule = useCallback(() => {
      const editor = quillRef.current?.getEditor();
      if (editor) {
        const mentionModule = editor.getModule("mention");
        console.log("Mention module:", mentionModule);

        // Ensure the mention module has the latest source function
        if (mentionModule && mentionModule.options && (mentionUsers || accountList.length > 0)) {
          mentionModule.options.source = mentionSource;
          console.log(
            "Mention module source updated with",
            mentionUsers?.length ?? accountList.length,
            "accounts"
          );
        }
      }
    }, [mentionSource, mentionUsers, accountList]);

    useEffect(() => {
      if (quillRef.current) {
        // Delay to ensure editor is fully initialized
        setTimeout(handleMentionModule, 100);
      }
    }, [handleMentionModule]);

    useEffect(() => {
      if (!selectedAttachmentImageUrl) return;

      const quillEditor = quillRef.current?.getEditor();
      if (!quillEditor) return;

      // Insert image at current cursor position or at the end
      const range = quillEditor.getSelection() || {
        index: quillEditor.getLength(),
        length: 0,
      };

      quillEditor.insertEmbed(range.index, "image", selectedAttachmentImageUrl);
      quillEditor.setSelection(range.index + 1, 0);

      // Update internal state and parent
      const updatedContent = quillEditor.root.innerHTML;
      if (!isControlled) setLocalValue(updatedContent);
      if (onChange) onChange(updatedContent);

      if (setOpenCustomImageSelector) {
        // Reset the image URL to avoid re-inserting on re-renders
        setOpenCustomImageSelector(false);
      }
    }, [isControlled, onChange, selectedAttachmentImageUrl, setOpenCustomImageSelector]);

    useImperativeHandle(
      ref,
      () => ({
        insertMention: (id: string, value: string) => {
          const quill = quillRef.current?.getEditor();
          if (quill) {
            const range = quill.getSelection(true) || { index: 0 };
            quill.insertEmbed(range.index, "mention", {
              id,
              value,
              denotationChar: "@",
            });
            quill.insertText(range.index + 1, " "); // Add a space after mention
            quill.setSelection(range.index + 2, 0);
          }
        },
        focus: () => {
          const quill = quillRef.current?.getEditor();
          if (quill) quill.focus();
        },
      }),
      []
    );

    return (
      <div
        ref={containerRef}
        className={`trello-editor-container ${className}`}
        style={{
          width: toCssSize(width),
          "--editor-min-height": toCssSize(minHeight),
          "--editor-max-height": toCssSize(maxHeight),
        } as React.CSSProperties}
      >
        <ReactQuill
          key="rich-text-editor"
          ref={quillRef}
          theme="snow"
          value={isControlled ? controlledValue : localValue}
          onChange={handleChange}
          modules={readOnly ? readOnlyModules : modulesRef.current}
          formats={formats}
          placeholder={placeholder}
          readOnly={readOnly}
          onChangeSelection={(range, source, editor) => {
            // This helps prevent the delta undefined error
            if (editor && editor.getContents) {
              try {
                editor.getContents();
              } catch (error) {
                console.warn("Editor delta error caught:", error);
              }
            }
          }}
        />
      </div>
    );
  }
);

export default RichTextEditorClient;

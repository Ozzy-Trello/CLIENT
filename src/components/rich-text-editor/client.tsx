import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
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
import type { RichTextEditorHandle, RichTextEditorProps } from "./index";

const toCssSize = (value: string | number) =>
  typeof value === "number" ? `${value}px` : value;

if (typeof window !== "undefined") {
  Quill.register("modules/mention", Mention, true);
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
      onImageUpload,
      transformReadOnlyHtml,
    },
    ref
  ) => {
    const isControlled = controlledValue !== undefined;
    const [localValue, setLocalValue] = useState<string>(initialValue);
    const quillRef = useRef<ReactQuill>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const mentionAnchorIndexRef = useRef<number | null>(null);
    const isControlledRef = useRef(isControlled);
    const onChangeRef = useRef(onChange);
    const setOpenCustomImageSelectorRef = useRef(setOpenCustomImageSelector);
    const onImageUploadRef = useRef(onImageUpload);

    isControlledRef.current = isControlled;
    onChangeRef.current = onChange;
    setOpenCustomImageSelectorRef.current = setOpenCustomImageSelector;
    onImageUploadRef.current = onImageUpload;

    const insertImage = useCallback((imageUrl: string, index?: number) => {
      const quillEditor = quillRef.current?.getEditor();
      if (!quillEditor) return;

      const insertIndex =
        index ?? quillEditor.getSelection()?.index ?? quillEditor.getLength();
      quillEditor.insertEmbed(insertIndex, "image", imageUrl);
      quillEditor.setSelection(insertIndex + 1, 0);

      const updatedContent = quillEditor.root.innerHTML;
      if (!isControlledRef.current) setLocalValue(updatedContent);
      onChangeRef.current?.(updatedContent);
      message.success("Image added");
    }, []);

    // Initialize modules object immediately
    const modulesRef = useRef<any>({
      toolbar: {
        container: toolbarConfig,
        handlers: {
          image: function () {
            if (setOpenCustomImageSelectorRef.current) {
              setOpenCustomImageSelectorRef.current(true);
              return;
            }

            const editor = quillRef.current?.getEditor();
            const cursorIndex = editor?.getSelection()?.index ?? editor?.getLength();
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = async () => {
              const file = input.files?.[0];
              if (!file) return;

              if (onImageUploadRef.current) {
                try {
                  insertImage(await onImageUploadRef.current(file), cursorIndex);
                } catch {
                  message.error("Failed to upload image");
                }
                return;
              }

              const reader = new FileReader();
              reader.onload = () => {
                if (typeof reader.result === "string") {
                  insertImage(reader.result, cursorIndex);
                }
              };
              reader.readAsDataURL(file);
            };
            input.click();
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
        positioningStrategy: "fixed",
        renderLoading: () => "Loading mentions...",
        onSelect: (
          item: any,
          insertItem: (data: any, programmaticInsert?: boolean) => void
        ) => {
          if (item?.disabled) return;
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

          renderList(
            [{ id: "", value: "No mentions found", disabled: true }],
            searchTerm
          );
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

        renderList(
          suggestions.length
            ? suggestions
            : [{ id: "", value: "No mentions found", disabled: true }],
          searchTerm
        );
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
            if (mentionModule.isOpen) {
              mentionModule.onSelectionChange(editor.getSelection());
            }
          }
        }
      }
    }, [mentionSource]);

    // Handle image paste
    useEffect(() => {
      if (readOnly || !containerRef.current) return;

      const pasteHandler = (e: ClipboardEvent) => {
        if (!e.clipboardData || !e.clipboardData.items) return;

        const imageItem = Array.from(e.clipboardData.items).find((item) =>
          item.type.startsWith("image/")
        );
        const file = imageItem?.getAsFile();
        if (!file) return;
        e.preventDefault();

        if (onImageUploadRef.current) {
          void onImageUploadRef.current(file)
            .then((url) => insertImage(url))
            .catch(() => message.error("Failed to upload image"));
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) insertImage(event.target.result as string);
        };
        reader.readAsDataURL(file);
      };

      containerRef.current.addEventListener("paste", pasteHandler, true);
      return () => {
        containerRef.current?.removeEventListener("paste", pasteHandler, true);
      };
    }, [insertImage, readOnly]);

    const handleChange = (content: string) => {
      if (!isControlled) setLocalValue(content);
      if (onChange) {
        onChange(content);
      }
    };

    const editorValue = readOnly && transformReadOnlyHtml
      ? transformReadOnlyHtml(isControlled ? controlledValue || "" : localValue)
      : isControlled ? controlledValue : localValue;

    useEffect(() => {
      if (!readOnly) return;
      quillRef.current?.getEditor().root.querySelectorAll("a").forEach((anchor) => {
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
      });
    }, [editorValue, readOnly]);

    const handleMentionModule = useCallback(() => {
      const editor = quillRef.current?.getEditor();
      if (editor) {
        const mentionModule = editor.getModule("mention");

        // Ensure the mention module has the latest source function
        if (mentionModule && mentionModule.options && (mentionUsers || accountList.length > 0)) {
          mentionModule.options.source = mentionSource;
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
          value={editorValue}
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

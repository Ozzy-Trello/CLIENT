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

const Embed = Quill.import("blots/embed");

class MentionBlot extends Embed {
  static create(data: any) {
    const node = super.create();
    node.setAttribute("data-id", data.id);
    node.setAttribute("data-value", data.value);
    node.innerText = `@${data.value}`;
    return node;
  }

  static value(node: any) {
    return {
      id: node.getAttribute("data-id"),
      value: node.getAttribute("data-value"),
    };
  }
}

MentionBlot.blotName = "mention";
MentionBlot.tagName = "span";
MentionBlot.className = "mention";

// Register Quill modules once at module level
if (typeof window !== "undefined") {
  try {
    Quill.register("modules/mention", Mention, true);
    Quill.register(MentionBlot);
  
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

interface RichTextEditorProps {
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
  hasCustomImageSelector?: boolean;
  openCustomImagesSelector?: boolean;
  setOpenCustomImageSelector?: Dispatch<SetStateAction<boolean>>;
  selectedAttachmentImageUrl?: string;
  forwardedRef?: any;
}

const RichTextEditorClient = forwardRef<any, RichTextEditorProps>(
  (
    {
      initialValue = "",
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
      forwardedRef,
    },
    ref
  ) => {
    const [value, setValue] = useState<string>(initialValue);
    const quillRef = useRef<ReactQuill>(null);
    const containerRef = useRef<HTMLDivElement>(null);

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
        allowedChars: /^[A-Za-z\sÅÄÖåäö]*$/,
        mentionDenotationChars: ["@"],
        blotName: "mention",
        source: (searchTerm: string, renderList: any) => {
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
      setValue(initialValue);
    }, [initialValue]);

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

        const values = accountList.map((account: Account) => {
          return { id: account.id, value: account.name || account.username };
        });

        if (searchTerm.length === 0) {
          renderList(values, searchTerm);
        } else {
          const matches = values.filter(
            (item) =>
              item.value.toLowerCase().indexOf(searchTerm.toLowerCase()) !== -1
          );
          renderList(matches, searchTerm);
        }
      },
      [accountList]
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
                setValue(updatedContent);
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
    }, [readOnly, onChange]);

    const handleChange = (content: string) => {
      setValue(content);
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
        if (mentionModule && mentionModule.options && accountList.length > 0) {
          mentionModule.options.source = mentionSource;
          console.log(
            "Mention module source updated with",
            accountList.length,
            "accounts"
          );
        }
      }
    }, [mentionSource, accountList]);

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
      setValue(updatedContent);
      if (onChange) onChange(updatedContent);

      if (setOpenCustomImageSelector) {
        // Reset the image URL to avoid re-inserting on re-renders
        setOpenCustomImageSelector(false);
      }
    }, [selectedAttachmentImageUrl]);

    useImperativeHandle(
      forwardedRef || ref,
      () => ({
        insertMention: (id: string, value: string) => {
          const quill = quillRef.current?.getEditor();
          if (quill) {
            const range = quill.getSelection(true) || { index: 0 };
            quill.insertEmbed(range.index, "mention", { id, value });
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
      <>
        {/* Add a style tag for any custom CSS */}
        <style jsx global>{`
          .trello-editor-container .ql-container {
            font-size: 14px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
              "Helvetica Neue", Arial, sans-serif;
          }
          .trello-editor-container .ql-editor {
            padding: 12px 15px;
            min-height: ${typeof minHeight === "string"
              ? minHeight
              : `${minHeight}px`};
            max-height: ${typeof maxHeight === "string"
              ? maxHeight
              : `${maxHeight}px`};
            overflow-y: auto;
          }
          .trello-editor-container .ql-editor.ql-blank::before {
            font-style: italic;
            color: #999;
          }
        `}</style>

        <div
          ref={containerRef}
          className={`trello-editor-container ${className}`}
          style={{
            width,
          }}
        >
          <ReactQuill
            key="rich-text-editor"
            ref={quillRef}
            theme="snow"
            value={value}
            onChange={handleChange}
            modules={modulesRef.current}
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
      </>
    );
  }
);

export default RichTextEditorClient;

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
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

    console.log("Mention module registered at module level");
  } catch (error) {
    console.warn("Quill mention module registration error:", error);
  }
}

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
}

const RichTextEditorClient: React.FC<RichTextEditorProps> = ({
  initialValue = "",
  onChange,
  placeholder = "comment..",
  width = "100%",
  minHeight = "100px",
  maxHeight = "400px",
  className = "",
  readOnly = false,
  workspaceId,
  boardId,
}) => {
  const [value, setValue] = useState<string>(initialValue);
  const quillRef = useRef<ReactQuill>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch account list only if workspaceId and boardId are provided
  const { data: accountListResponse } = useAccountList({
    workspaceId: workspaceId || "",
    boardId: boardId || "",
  });

  const accountList = accountListResponse?.data || [];

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // Debug log to check if we have account data
  useEffect(() => {
    console.log("Account list updated:", accountList);
  }, [accountList]);

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

              // Allow time for image to load, then adjust editor height
              setTimeout(adjustEditorHeight, 100);
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

  // Adjust editor height based on content
  const adjustEditorHeight = useCallback(() => {
    const quillEditor = quillRef.current?.getEditor();
    if (!quillEditor || !quillEditor.root) return;

    const editorContainer = quillEditor.root;
    if (!editorContainer) return;

    // Reset height to auto to get the actual content height
    editorContainer.style.height = "auto";

    // Get content height
    const contentHeight = editorContainer.scrollHeight;

    // Convert minHeight and maxHeight to numbers
    const minHeightPx =
      typeof minHeight === "string" ? parseInt(minHeight) : minHeight;

    const maxHeightPx =
      typeof maxHeight === "string" ? parseInt(maxHeight) : maxHeight;

    // Set height based on content, within min/max bounds
    if (contentHeight < minHeightPx) {
      editorContainer.style.height = `${minHeightPx}px`;
      editorContainer.style.overflowY = "hidden";
    } else if (contentHeight > maxHeightPx) {
      editorContainer.style.height = `${maxHeightPx}px`;
      editorContainer.style.overflowY = "auto";
    } else {
      editorContainer.style.height = `${contentHeight}px`;
      editorContainer.style.overflowY = "hidden";
    }
  }, [minHeight, maxHeight]);

  // Adjust height when content changes
  useEffect(() => {
    if (quillRef.current) {
      adjustEditorHeight();
    }
  }, [value]);

  // Adjust height on initial render
  useEffect(() => {
    // Wait for editor to be fully initialized
    setTimeout(adjustEditorHeight, 100);
  }, []);

  const handleMentionModule = () => {
    const editor = quillRef.current?.getEditor();
    if (editor) {
      const mentionModule = editor.getModule("mention");
      console.log("Mention module:", mentionModule);
    }
  };

  useEffect(() => {
    handleMentionModule();
  }, [quillRef]);

  const handleChange = (content: string) => {
    setValue(content);
    if (onChange) {
      onChange(content);
    }
  };

  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, false] }],
        ["bold", "italic", "underline", "strike", "blockquote"],
        [
          { list: "ordered" },
          { list: "bullet" },
          { indent: "-1" },
          { indent: "+1" },
        ],
        ["link", "image"],
        ["clean"],
      ],
      clipboard: {
        matchVisual: false,
      },
      mention: {
        allowedChars: /^[A-Za-z\sÅÄÖåäö]*$/,
        mentionDenotationChars: ["@"],
        blotName: "mention",
        source: function (
          searchTerm: string,
          renderList: (matches: any[], searchTerm: string) => void
        ) {
          const values = accountList.map((account: Account) => {
            return { id: account.id, value: account.name || account.username };
          });

          console.log("Mention source called with:", searchTerm, "values:", values);

          if (searchTerm.length === 0) {
            renderList(values, searchTerm);
          } else {
            const matches = values.filter(
              (item) =>
                item.value.toLowerCase().indexOf(searchTerm.toLowerCase()) !==
                -1
            );
            renderList(matches, searchTerm);
          }
        },
      },
    }),
    [accountList]
  );

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

  // Define the custom styles inline
  const customStyles = {
    ".trello-editor-container .ql-container": {
      fontSize: "14px",
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    },
    ".trello-editor-container .ql-editor": {
      padding: "12px 15px",
    },
  };

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
        }
      `}</style>

      <div
        ref={containerRef}
        className={`trello-editor-container ${className}`}
        style={{ width }}
      >
        <ReactQuill
          key="rich-text-editor"
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={handleChange}
          modules={modules}
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
          onFocus={handleMentionModule}
        />
      </div>
    </>
  );
};

export default RichTextEditorClient;

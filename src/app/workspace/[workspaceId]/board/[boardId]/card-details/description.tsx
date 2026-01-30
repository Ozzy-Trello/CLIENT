import CardAttachmentImageListModal from "@components/modal-list-card-attachment-images";
import RichTextEditor from "@components/rich-text-editor";
import { useCardDetails } from "@hooks/card-details";
import { Card } from "@myTypes/card";
import { Button, Typography } from "antd";
import { AlignLeft, Edit, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback } from "react";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { selectTheme, selectIsDarkMode } from "@store/app_slice";
import { useBoardPermissionsContext } from "@providers/board-permissions-context";

const Description: React.FC<{
  card: Card;
  setSelectedCard: Dispatch<SetStateAction<Card | null>>;
}> = ({ card, setSelectedCard }) => {
  const theme = useSelector(selectTheme);
  const isDarkMode = useSelector(selectIsDarkMode);
  const { colors } = theme;

  const [isEditingDescription, setIsEditingDescription] =
    useState<boolean>(false);
  const [newDescription, setNewDescription] = useState<string>(
    card?.description || ""
  );
  const params = useParams();
  const boardId = Array.isArray(params.boardId)
    ? params.boardId[0]
    : params.boardId;
  const workspaceId = Array.isArray(params.workspaceId)
    ? params.workspaceId[0]
    : params.workspaceId;
  const [openCardAttachmentListModal, setOpenCardAttachmentListModal] =
    useState<boolean>(false);
  const [selectedattachmentImageUrl, setSelectedAttachmentImageUrl] =
    useState<string>("");

  const { updateCardAsync, isUpdating, refetch } = useCardDetails(
    card.id,
    card.listId,
    boardId || ""
  );

  // Get board permissions
  const { canUpdateCard } = useBoardPermissionsContext();

  const enableEditDescription = () => {
    if (canUpdateCard()) {
      setIsEditingDescription(true);
    }
  };

  const disableEditDescription = () => {
    setIsEditingDescription(false);
  };

  const handleSaveDescriptionClick = async () => {
    try {
      await updateCardAsync({
        description: newDescription,
      });
      
      if (setSelectedCard) {
        setSelectedCard((prevCard) => {
          if (!prevCard) return prevCard;
          return {
            ...prevCard,
            description: newDescription,
          };
        });
      }
      // Refetch card details to get the newest state
      refetch();
      setIsEditingDescription(false);
    } catch (error) {
      console.error("Failed to save description:", error);
      // isUpdating will automatically be reset to false on error
    }
  };

  useEffect(() => {
    // When switching cards, reset edit state and sync description
    setIsEditingDescription(false);
    setNewDescription(card?.description || "");
  }, [card?.id]);

  useEffect(() => {
    if (!isEditingDescription) {
      setNewDescription(card?.description || "");
    }
  }, [card?.description, isEditingDescription]);

  // Linkify plain text URLs that are not already inside anchor tags
  const linkifyText = (html: string): string => {
    if (!html || typeof window === 'undefined') return html;

    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const walker = document.createTreeWalker(
        doc.body,
        NodeFilter.SHOW_TEXT,
        null
      );

      const urlRegex = /(https?:\/\/[^\s<>"]+)/gi;
      const textNodes: Text[] = [];

      let node;
      while ((node = walker.nextNode() as Text)) {
        if (node.parentElement?.tagName === 'A') continue;
        textNodes.push(node);
      }

      for (const node of textNodes) {
        const text = node.textContent || '';
        let match;
        let lastIndex = 0;
        const fragments: Node[] = [];

        // Reset regex state
        urlRegex.lastIndex = 0;

        while ((match = urlRegex.exec(text)) !== null) {
          const url = match[0];
          const index = match.index;

          // Text before match
          if (index > lastIndex) {
            fragments.push(document.createTextNode(text.slice(lastIndex, index)));
          }

          // Link
          const a = document.createElement('a');
          a.href = url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.className = 'text-blue-600 hover:underline cursor-pointer';
          a.textContent = url;
          // Fallback style in case classes are stripped or overridden
          a.style.color = '#2563eb';
          a.style.textDecoration = 'underline';
          a.style.cursor = 'pointer';
          
          fragments.push(a);

          lastIndex = index + url.length;
        }

        // Only replace if matches were found
        if (fragments.length > 0) {
          // Remaining text
          if (lastIndex < text.length) {
            fragments.push(document.createTextNode(text.slice(lastIndex)));
          }

          const parent = node.parentNode;
          if (parent) {
            for (const fragment of fragments) {
              parent.insertBefore(fragment, node);
            }
            parent.removeChild(node);
          }
        }
      }

      return doc.body.innerHTML;
    } catch (e) {
      return html;
    }
  };

  const readOnlyDescription = card.description || newDescription;
  const normalizedReadOnlyDescription = (() => {
    if (!readOnlyDescription) return "";
    if (typeof window === "undefined") return readOnlyDescription;

    try {
      const doc = new DOMParser().parseFromString(
        readOnlyDescription,
        "text/html"
      );

      // Quill sometimes stores bullet lists as <ol><li data-list="bullet">...</li></ol>
      // and indentation via class names like "ql-indent-1". Convert to more standard HTML.
      const ols = Array.from(doc.querySelectorAll("ol"));
      for (const ol of ols) {
        const lis = Array.from(ol.querySelectorAll(":scope > li"));
        if (!lis.length) continue;

        const hasBullet = lis.some((li) => li.getAttribute("data-list") === "bullet");
        const hasOrdered = lis.some(
          (li) => li.getAttribute("data-list") === "ordered"
        );

        // Only convert when it is clearly a bullet list
        if (hasBullet && !hasOrdered) {
          const ul = doc.createElement("ul");
          // preserve attributes/styles where possible
          for (const attr of Array.from(ol.attributes)) {
            ul.setAttribute(attr.name, attr.value);
          }
          while (ol.firstChild) {
            ul.appendChild(ol.firstChild);
          }
          ol.replaceWith(ul);
        }
      }

      // Remove Quill list markers
      const listLis = Array.from(doc.querySelectorAll("li[data-list]"));
      for (const li of listLis) {
        li.removeAttribute("data-list");
      }

      // Convert Quill indentation classes to inline margins so it renders without Quill CSS
      const indented = Array.from(
        doc.querySelectorAll(
          '[class*="ql-indent-"], [class*="ql-align-"], [class*="ql-direction-"]'
        )
      ) as HTMLElement[];
      for (const el of indented) {
        const classList = Array.from(el.classList);

        const indentClass = classList.find((c) => c.startsWith("ql-indent-"));
        if (indentClass) {
          const n = Number(indentClass.replace("ql-indent-", ""));
          if (Number.isFinite(n) && n > 0) {
            const existing = el.getAttribute("style") || "";
            const marginLeft = `${n * 1.5}em`;
            el.setAttribute(
              "style",
              `${existing}${existing && !existing.trim().endsWith(";") ? ";" : ""}margin-left:${marginLeft};`
            );
          }
          el.classList.remove(indentClass);
        }

        const alignClass = classList.find((c) => c.startsWith("ql-align-"));
        if (alignClass) {
          const align = alignClass.replace("ql-align-", "");
          if (align === "center" || align === "right" || align === "justify") {
            const existing = el.getAttribute("style") || "";
            el.setAttribute(
              "style",
              `${existing}${existing && !existing.trim().endsWith(";") ? ";" : ""}text-align:${align};`
            );
          }
          el.classList.remove(alignClass);
        }
      }

      // Ensure lists have visible markers & indentation even without typography defaults
      const lists = Array.from(doc.querySelectorAll("ul, ol")) as HTMLElement[];
      for (const list of lists) {
        const tag = list.tagName.toLowerCase();
        const existing = list.getAttribute("style") || "";
        const listStyle = tag === "ol" ? "decimal" : "disc";
        list.setAttribute(
          "style",
          `${existing}${existing && !existing.trim().endsWith(";") ? ";" : ""}padding-left:1.25em;list-style:${listStyle};`
        );
      }

      // Apply linkification to convert plain text URLs to clickable links
      return linkifyText(doc.body.innerHTML);
    } catch (e) {
      return readOnlyDescription;
    }
  })();

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <AlignLeft size={18} />
          <h1 className="text-5xl font-bold mb-0">Description</h1>
        </div>
        {!isEditingDescription && (
          <Button
            icon={<Edit size={14} />}
            type="text"
            size="small"
            onClick={enableEditDescription}
            className="rounded-md hover:opacity-80"
            style={{
              color: `rgb(${colors["text-muted"]})`,
              backgroundColor: "transparent",
            }}
          >
            Edit
          </Button>
        )}
      </div>

      {isEditingDescription ? (
        <div
          className="rounded-md overflow-hidden ml-8"
          style={{
            border: `1px solid rgb(${colors.border})`,
            backgroundColor: `rgb(${colors.surface})`,
          }}
        >
          <RichTextEditor
            initialValue={newDescription}
            onChange={(content: string) => {
              setNewDescription(content);
            }}
            placeholder="Add a more detailed description..."
            className="w-full"
            workspaceId={workspaceId}
            boardId={boardId}
            hasCustomImageSelector={true}
            setOpenCustomImageSelector={setOpenCardAttachmentListModal}
            openCustomImagesSelector={openCardAttachmentListModal}
            selectedAttachmentImageUrl={selectedattachmentImageUrl}
          />
          <div
            className="flex justify-end p-2"
            style={{
              backgroundColor: `rgb(${colors.muted})`,
              borderTop: `1px solid rgb(${colors.border})`,
            }}
          >
            <Button
              onClick={disableEditDescription}
              size="middle"
              className="mr-2 rounded-md"
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              onClick={handleSaveDescriptionClick}
              size="middle"
              className="rounded-md bg-blue-600 hover:bg-blue-700"
              loading={isUpdating}
              disabled={isUpdating}
            >
              {isUpdating ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={`ml-8 p-3 rounded-md min-h-20 transition-colors`}
          style={{
            backgroundColor: `rgb(${colors.muted})`,
            color: `rgb(${colors.text})`,
          }}
        >
          {readOnlyDescription ? (
            <div
              className="prose prose-sm max-w-none prose-ul:list-disc prose-ol:list-decimal prose-ul:pl-5 prose-ol:pl-5 prose-a:text-blue-600 prose-a:underline prose-a:cursor-pointer"
              dangerouslySetInnerHTML={{ __html: normalizedReadOnlyDescription }}
              onClick={(e) => {
                // Handle link clicks to open in new tab
                const target = e.target as HTMLElement;
                if (target.tagName === 'A') {
                  e.preventDefault();
                  e.stopPropagation();
                  const href = target.getAttribute('href');
                  if (href) {
                    window.open(href, '_blank', 'noopener,noreferrer');
                  }
                }
              }}
            />
          ) : (
            <span style={{ color: `rgb(${colors["text-muted"]})` }}>
              Add a more detailed description...
            </span>
          )}
        </div>
      )}

      <CardAttachmentImageListModal
        isVisible={openCardAttachmentListModal}
        selectedCard={card}
        setSelectedImageUrl={setSelectedAttachmentImageUrl}
        handleCancel={() => {
          setOpenCardAttachmentListModal(false);
        }}
      />
    </div>
  );
};

export default Description;

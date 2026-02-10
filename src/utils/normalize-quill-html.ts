/**
 * Normalize Quill HTML output to render nicely without Quill stylesheets.
 * Applies bullet/ordered list fixes, indentation, alignment, and list markers.
 */
export const normalizeQuillHtml = (html: string): string => {
  if (!html) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return html;
  }

  try {
    const doc = new DOMParser().parseFromString(html, "text/html");

    const ols = Array.from(doc.querySelectorAll("ol"));
    for (const ol of ols) {
      const lis = Array.from(ol.querySelectorAll(":scope > li"));
      if (!lis.length) continue;

      const hasBullet = lis.some((li) => li.getAttribute("data-list") === "bullet");
      const hasOrdered = lis.some((li) => li.getAttribute("data-list") === "ordered");

      if (hasBullet && !hasOrdered) {
        const ul = doc.createElement("ul");
        for (const attr of Array.from(ol.attributes)) {
          ul.setAttribute(attr.name, attr.value);
        }
        while (ol.firstChild) {
          ul.appendChild(ol.firstChild);
        }
        ol.replaceWith(ul);
      }
    }

    const listLis = Array.from(doc.querySelectorAll("li[data-list]"));
    for (const li of listLis) {
      li.removeAttribute("data-list");
    }

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
          const needsSemicolon = existing && !existing.trim().endsWith(";");
          const marginLeft = `${n * 1.5}em`;
          el.setAttribute(
            "style",
            `${existing}${needsSemicolon ? ";" : ""}margin-left:${marginLeft};`
          );
        }
        el.classList.remove(indentClass);
      }

      const alignClass = classList.find((c) => c.startsWith("ql-align-"));
      if (alignClass) {
        const align = alignClass.replace("ql-align-", "");
        if (align === "center" || align === "right" || align === "justify") {
          const existing = el.getAttribute("style") || "";
          const needsSemicolon = existing && !existing.trim().endsWith(";");
          el.setAttribute(
            "style",
            `${existing}${needsSemicolon ? ";" : ""}text-align:${align};`
          );
        }
        el.classList.remove(alignClass);
      }
    }

    const lists = Array.from(doc.querySelectorAll("ul, ol")) as HTMLElement[];
    for (const list of lists) {
      const tag = list.tagName.toLowerCase();
      const existing = list.getAttribute("style") || "";
      const needsSemicolon = existing && !existing.trim().endsWith(";");
      const listStyle = tag === "ol" ? "decimal" : "disc";
      list.setAttribute(
        "style",
        `${existing}${needsSemicolon ? ";" : ""}padding-left:1.25em;list-style:${listStyle};`
      );
    }

    return doc.body.innerHTML;
  } catch {
    return html;
  }
};

/**
 * Turn plain-text URLs within HTML fragments into clickable links.
 */
export const linkifyHtml = (html: string): string => {
  if (!html) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return html;
  }

  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (typeof document === "undefined") {
      return doc.body.innerHTML;
    }

    const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
    const urlRegex = /(https?:\/\/[^\s<>"]+)/gi;
    const textNodes: Text[] = [];

    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
      if (node?.parentElement?.tagName === "A") continue;
      if (node) textNodes.push(node);
    }

    for (const textNode of textNodes) {
      const text = textNode.textContent || "";
      let match: RegExpExecArray | null;
      let lastIndex = 0;
      const fragments: Node[] = [];
      urlRegex.lastIndex = 0;

      while ((match = urlRegex.exec(text)) !== null) {
        const url = match[0];
        const index = match.index;

        if (index > lastIndex) {
          fragments.push(document.createTextNode(text.slice(lastIndex, index)));
        }

        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.target = "_blank";
        anchor.rel = "noopener noreferrer";
        anchor.className = "text-blue-600 hover:underline cursor-pointer";
        anchor.textContent = url;
        anchor.style.color = "#2563eb";
        anchor.style.textDecoration = "underline";
        anchor.style.cursor = "pointer";
        fragments.push(anchor);

        lastIndex = index + url.length;
      }

      if (fragments.length === 0) continue;

      if (lastIndex < text.length) {
        fragments.push(document.createTextNode(text.slice(lastIndex)));
      }

      const parent = textNode.parentNode;
      if (parent) {
        for (const fragment of fragments) {
          parent.insertBefore(fragment, textNode);
        }
        parent.removeChild(textNode);
      }
    }

    return doc.body.innerHTML;
  } catch {
    return html;
  }
};

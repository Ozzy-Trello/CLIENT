export async function uploadEmbeddedDescriptionImages(
  html: string,
  upload: (file: File) => Promise<string>,
  uploaded = new Map<string, string>()
): Promise<string> {
  const document = new DOMParser().parseFromString(html, "text/html");
  let changed = false;
  for (const image of Array.from(document.querySelectorAll("img[src]"))) {
    const source = image.getAttribute("src")?.trim() || "";
    const comma = source.indexOf(",");
    const match = source.slice(0, comma).match(/^data:(image\/[^;,]+)(?:;[^,]*)?;base64$/i);
    if (!match) continue;

    let url = uploaded.get(source);
    if (!url) {
      const bytes = Uint8Array.from(atob(source.slice(comma + 1)), char => char.charCodeAt(0));
      const extension = match[1].split("/")[1].split("+")[0];
      url = await upload(new File([bytes], `description-image.${extension}`, { type: match[1] }));
      uploaded.set(source, url);
    }
    image.setAttribute("src", url);
    changed = true;
  }
  return changed ? document.body.innerHTML : html;
}

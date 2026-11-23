import { uploadEmbeddedDescriptionImages } from "./description-images";

const image = "data:image/png;base64,aGVsbG8=";

describe("description image uploads", () => {
  it("keeps existing URL images and text exactly as supplied", async () => {
    const html = '<p>Hello <strong>team</strong></p><img src="https://files.test/image.png">';
    const upload = jest.fn();
    expect(await uploadEmbeddedDescriptionImages(html, upload)).toBe(html);
    expect(upload).not.toHaveBeenCalled();
  });

  it("uploads repeated embedded images once and preserves position and attributes", async () => {
    const upload = jest.fn().mockResolvedValue("https://files.test/image.png");
    const html = `<p>Before<img src="${image}" alt="Design" width="100">After</p><img src="${image}">`;
    const result = await uploadEmbeddedDescriptionImages(html, upload);
    expect(upload).toHaveBeenCalledTimes(1);
    const file = upload.mock.calls[0][0] as File;
    expect(file.type).toBe("image/png");
    expect(file.size).toBe(5);
    expect(result).toBe('<p>Before<img src="https://files.test/image.png" alt="Design" width="100">After</p><img src="https://files.test/image.png">');
  });

  it("recognizes HTML-encoded sources and case-insensitive data URLs", async () => {
    const upload = jest.fn().mockResolvedValue("https://files.test/image.png");
    const html = '<img src="DATA&#58;IMAGE/PNG;charset=utf-8;BASE64,aGVsbG8=">';
    expect(await uploadEmbeddedDescriptionImages(html, upload)).toBe('<img src="https://files.test/image.png">');
  });

  it("retains successful uploads on a failed save attempt so retries do not duplicate files", async () => {
    const cache = new Map<string, string>();
    const second = "data:image/jpeg;base64,d29ybGQ=";
    const html = `<img src="${image}"><p>Text</p><img src="${second}">`;
    const upload = jest.fn().mockResolvedValueOnce("https://files.test/first.png").mockRejectedValueOnce(new Error("offline"));
    await expect(uploadEmbeddedDescriptionImages(html, upload, cache)).rejects.toThrow("offline");
    const retry = jest.fn().mockResolvedValue("https://files.test/second.jpg");
    expect(await uploadEmbeddedDescriptionImages(html, retry, cache)).toBe('<img src="https://files.test/first.png"><p>Text</p><img src="https://files.test/second.jpg">');
    expect(retry).toHaveBeenCalledTimes(1);
    expect(html).toContain(image);
  });

  it("does not upload malformed base64 data", async () => {
    const upload = jest.fn();
    await expect(uploadEmbeddedDescriptionImages('<img src="data:image/png;base64,%%%">', upload)).rejects.toThrow();
    expect(upload).not.toHaveBeenCalled();
  });
});

import React from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { message } from "antd";
import RichTextEditorClient from "./client";

const mockEditor: any = {
  root: { innerHTML: "" },
  getSelection: () => ({ index: 3 }),
  getLength: () => 3,
  getModule: () => undefined,
  setSelection: jest.fn(),
  insertEmbed: jest.fn((_index, _type, url) => { mockEditor.root.innerHTML = `<p>Text</p><img src="${url}">`; }),
};

jest.mock("react-quill", () => {
  const React = require("react");
  return { __esModule: true, default: React.forwardRef((_props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({ getEditor: () => mockEditor }));
    return <div data-testid="quill" />;
  }) };
});
jest.mock("quill", () => ({ __esModule: true, default: { import: () => class {}, register: jest.fn() } }));
jest.mock("quill-mention", () => ({ __esModule: true, default: class {} }));
jest.mock("../../hooks/account", () => ({ useAccountList: () => ({ data: { data: [] } }) }));
jest.mock("antd", () => ({ message: { success: jest.fn(), error: jest.fn() } }));

describe("rich text description image input", () => {
  beforeEach(() => jest.clearAllMocks());

  it.each(["paste", "drop"])("uploads %s images and inserts only the returned URL at the cursor", async event => {
    const file = new File(["image"], "design.png", { type: "image/png" });
    const upload = jest.fn().mockResolvedValue("https://files.test/design.png");
    const onChange = jest.fn();
    const view = render(<RichTextEditorClient onImageUpload={upload} onChange={onChange} />);
    const container = view.container.firstChild!;
    await act(async () => {
      const transfer = { files: [file], items: [] };
      if (event === "paste") fireEvent.paste(container, { clipboardData: transfer });
      else fireEvent.drop(container, { dataTransfer: transfer });
    });
    expect(upload).toHaveBeenCalledWith(file);
    expect(mockEditor.insertEmbed).toHaveBeenCalledWith(3, "image", "https://files.test/design.png");
    expect(onChange).toHaveBeenCalledWith('<p>Text</p><img src="https://files.test/design.png">');
  });

  it("does not insert base64 as a fallback when uploading fails", async () => {
    const upload = jest.fn().mockRejectedValue(new Error("offline"));
    const view = render(<RichTextEditorClient onImageUpload={upload} />);
    await act(async () => fireEvent.paste(view.container.firstChild!, {
      clipboardData: { files: [new File(["image"], "design.png", { type: "image/png" })], items: [] },
    }));
    expect(mockEditor.insertEmbed).not.toHaveBeenCalled();
    expect(message.error).toHaveBeenCalledWith("Failed to upload image");
  });

  it("does not insert a late upload into an editor that has been closed", async () => {
    let complete!: (url: string) => void;
    const upload = jest.fn().mockReturnValue(new Promise(resolve => { complete = resolve; }));
    const view = render(<RichTextEditorClient onImageUpload={upload} />);
    fireEvent.paste(view.container.firstChild!, {
      clipboardData: { files: [new File(["image"], "design.png", { type: "image/png" })], items: [] },
    });
    view.unmount();
    await act(async () => complete("https://files.test/design.png"));
    expect(mockEditor.insertEmbed).not.toHaveBeenCalled();
  });
});

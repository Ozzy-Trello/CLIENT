declare module "quill" {
  type QuillRange = {
    index: number;
    length?: number;
  };

  class Quill {
    static import(path: string): any;
    static register(path: string, def: any, suppressWarning?: boolean): void;
    static register(def: any, suppressWarning?: boolean): void;

    root: {
      innerHTML: string;
    };

    getModule(name: string): any;
    getSelection(focus?: boolean): QuillRange | null;
    getLength(): number;
    insertEmbed(index: number, type: string, value: any): void;
    insertText(index: number, text: string): void;
    setSelection(index: number, length: number): void;
    focus(): void;
  }

  export default Quill;
}

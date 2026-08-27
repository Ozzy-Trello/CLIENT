const mockGlobalWorkerOptions = { workerSrc: "" };

jest.mock("react-pdf", () => ({
  pdfjs: {
    GlobalWorkerOptions: mockGlobalWorkerOptions,
    version: "5.3.93",
  },
}));

import { setupPDFWorker } from "./pdf-worker-setup";

describe("setupPDFWorker", () => {
  it("uses the deployed PDF.js module worker", async () => {
    await setupPDFWorker();

    expect(mockGlobalWorkerOptions.workerSrc).toBe(
      `${window.location.origin}/pdf.worker.min.mjs`,
    );
  });
});

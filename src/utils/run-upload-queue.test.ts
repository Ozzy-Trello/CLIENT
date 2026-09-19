import { runUploadQueue, UploadQueueTask } from "./run-upload-queue";

const makeTask = (name: string): UploadQueueTask => ({
  displayName: name,
  buildFile: async () => new File(["x"], name),
});

describe("runUploadQueue", () => {
  it("uploads every task", async () => {
    const uploaded: string[] = [];
    const tasks = ["a", "b", "c", "d", "e"].map(makeTask);

    const result = await runUploadQueue(tasks, async (file) => {
      uploaded.push(file.name);
    });

    expect(uploaded.sort()).toEqual(["a", "b", "c", "d", "e"]);
    expect(result).toEqual({ completed: 5, failures: [] });
  });

  // Satu kegagalan dulu membatalkan seluruh sisa antrean, sehingga pengguna
  // harus mengulang dari nol.
  it("keeps going after a failure and reports which ones failed", async () => {
    const uploaded: string[] = [];
    const tasks = ["a", "bad", "c"].map(makeTask);

    const result = await runUploadQueue(tasks, async (file) => {
      if (file.name === "bad") throw new Error("timeout of 30000ms exceeded");
      uploaded.push(file.name);
    });

    expect(uploaded.sort()).toEqual(["a", "c"]);
    expect(result.completed).toBe(3);
    expect(result.failures).toEqual([
      { displayName: "bad", reason: "timeout of 30000ms exceeded" },
    ]);
  });

  it("runs several uploads at once instead of one at a time", async () => {
    let running = 0;
    let peak = 0;
    const tasks = Array.from({ length: 9 }, (_, i) => makeTask(`f${i}`));

    await runUploadQueue(tasks, async () => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running -= 1;
    });

    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThanOrEqual(3);
  });

  it("never exceeds the queue length in workers", async () => {
    let peak = 0;
    let running = 0;

    await runUploadQueue([makeTask("only")], async () => {
      running += 1;
      peak = Math.max(peak, running);
      running -= 1;
    });

    expect(peak).toBe(1);
  });

  it("does nothing when there is no task", async () => {
    const upload = jest.fn();
    const result = await runUploadQueue([], upload);

    expect(upload).not.toHaveBeenCalled();
    expect(result).toEqual({ completed: 0, failures: [] });
  });

  it("reports progress as tasks finish", async () => {
    const seen: number[] = [];
    const tasks = ["a", "b", "c"].map(makeTask);

    await runUploadQueue(tasks, async () => {}, (completed) => {
      seen.push(completed);
    });

    expect(seen).toEqual([1, 2, 3]);
  });
});

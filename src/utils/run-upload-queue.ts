export type UploadQueueTask = {
  displayName: string;
  buildFile: () => Promise<File>;
};

export type UploadQueueResult = {
  completed: number;
  failures: { displayName: string; reason: string }[];
};

const CONCURRENCY = 3;

const reasonOf = (error: unknown): string => {
  const message = (error as any)?.message;
  return typeof message === "string" && message ? message : "Upload gagal";
};

/**
 * Sebuah ZIP dibongkar di browser menjadi banyak gambar, sehingga satu pilihan
 * file bisa berubah jadi puluhan unggahan. Mengerjakannya satu per satu membuat
 * total waktu menumpuk sampai melewati batas timeout, dan satu kegagalan
 * membatalkan sisa antrean. Beberapa unggahan dijalankan berbarengan, dan yang
 * gagal dikumpulkan supaya sisanya tetap terkirim.
 */
export const runUploadQueue = async (
  tasks: UploadQueueTask[],
  upload: (file: File) => Promise<void>,
  onProgress?: (completed: number, current: string) => void,
): Promise<UploadQueueResult> => {
  const failures: UploadQueueResult["failures"] = [];
  let completed = 0;
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (cursor < tasks.length) {
      const task = tasks[cursor];
      cursor += 1;

      try {
        await upload(await task.buildFile());
      } catch (error) {
        failures.push({ displayName: task.displayName, reason: reasonOf(error) });
      }

      completed += 1;
      onProgress?.(completed, task.displayName);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, worker),
  );

  return { completed, failures };
};

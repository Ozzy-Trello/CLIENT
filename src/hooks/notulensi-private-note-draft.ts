import { useEffect, useState } from "react";

export function useNotulensiPrivateNoteDraft(key: string, content: string) {
  const [draft, setDraft] = useState<{ key: string; content: string } | null>(null);

  useEffect(() => {
    setDraft(null);
  }, [key]);

  return {
    value: draft?.key === key ? draft.content : content,
    setValue: (value: string) => setDraft({ key, content: value }),
    reset: () => setDraft(null),
  };
}

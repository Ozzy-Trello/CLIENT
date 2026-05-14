# Chat Notification Toast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a fade-in/fade-out notification bubble in the bottom-right corner when a new chat message arrives and the conversation window is not already open.

**Architecture:** A new `ChatNotificationToast` component listens for a custom DOM event `chat:toast` dispatched by `ChatWidget` whenever an incoming message arrives with no active open window. Clicking a toast dispatches `chat:open-window`, which `ChatWidget` listens for and routes to its existing `openWindow` function. When a window opens, `ChatWidget` dispatches `chat:window-opened` so the toast component can clear any pending toasts for that conversation.

**Tech Stack:** React 18, TypeScript, Next.js 14, inline styles (no Tailwind — match existing chat-widget pattern), custom DOM events for cross-component communication without prop-drilling.

---

## File Map

| Action | File |
|--------|------|
| Create | `src/components/chat/chat-notification-toast.tsx` |
| Modify | `src/components/chat/chat-widget.tsx` |
| Modify | `src/app/workspace/layout.tsx` |

---

### Task 1 — Create `ChatNotificationToast` component

**Files:**
- Create: `src/components/chat/chat-notification-toast.tsx`

- [x] **Step 1: Create the file with full implementation**

Create `src/components/chat/chat-notification-toast.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";

type Toast = {
  id: string;
  peerUserId: string;
  senderName: string;
  content: string;
  visible: boolean;
};

const MAX_TOASTS = 5;
const TOAST_VISIBLE_MS = 3000;
const TOAST_FADE_MS = 300;

export default function ChatNotificationToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismissTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearTimer = (id: string) => {
    const t = dismissTimersRef.current.get(id);
    if (t !== undefined) {
      clearTimeout(t);
      dismissTimersRef.current.delete(id);
    }
  };

  const removeToast = (id: string) => {
    clearTimer(id);
    setToasts((current) => current.filter((t) => t.id !== id));
  };

  const startDismiss = (id: string) => {
    clearTimer(id);
    setToasts((current) =>
      current.map((t) => (t.id === id ? { ...t, visible: false } : t)),
    );
    const timer = setTimeout(() => removeToast(id), TOAST_FADE_MS);
    dismissTimersRef.current.set(id, timer);
  };

  useEffect(() => {
    const handleToast = (e: Event) => {
      const { peerUserId, senderName, content } = (e as CustomEvent<{
        peerUserId: string;
        senderName: string;
        content: string;
      }>).detail;

      const id = `toast-${peerUserId}-${Date.now()}`;

      setToasts((current) => {
        const next: Toast[] = [
          ...current,
          { id, peerUserId, senderName, content, visible: false },
        ];
        // Keep newest MAX_TOASTS
        return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
      });

      // Fade in on next paint
      const fadeInTimer = setTimeout(() => {
        setToasts((current) =>
          current.map((t) => (t.id === id ? { ...t, visible: true } : t)),
        );
      }, 10);

      // Auto-dismiss
      const dismissTimer = setTimeout(() => startDismiss(id), TOAST_VISIBLE_MS);
      dismissTimersRef.current.set(id, dismissTimer);

      return () => clearTimeout(fadeInTimer);
    };

    const handleWindowOpened = (e: Event) => {
      const { peerUserId } = (e as CustomEvent<{ peerUserId: string }>).detail;
      setToasts((current) => {
        current
          .filter((t) => t.peerUserId === peerUserId)
          .forEach((t) => clearTimer(t.id));
        return current.filter((t) => t.peerUserId !== peerUserId);
      });
    };

    window.addEventListener("chat:toast", handleToast);
    window.addEventListener("chat:window-opened", handleWindowOpened);

    return () => {
      window.removeEventListener("chat:toast", handleToast);
      window.removeEventListener("chat:window-opened", handleWindowOpened);
      for (const timer of dismissTimersRef.current.values()) {
        clearTimeout(timer);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClick = (peerUserId: string) => {
    window.dispatchEvent(
      new CustomEvent("chat:open-window", { detail: { peerUserId } }),
    );
  };

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: "80px",
        right: "16px",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => handleClick(toast.peerUserId)}
          style={{
            background: "#1f1f1f",
            color: "#fff",
            borderRadius: "8px",
            padding: "10px 14px",
            maxWidth: "280px",
            cursor: "pointer",
            pointerEvents: "auto",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            opacity: toast.visible ? 1 : 0,
            transform: toast.visible ? "translateY(0)" : "translateY(8px)",
            transition: `opacity ${TOAST_FADE_MS}ms ease, transform ${TOAST_FADE_MS}ms ease`,
          }}
        >
          <div
            style={{
              fontWeight: 600,
              fontSize: "13px",
              marginBottom: "2px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {toast.senderName}
          </div>
          <div
            style={{
              fontSize: "12px",
              opacity: 0.85,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {toast.content}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [x] **Step 2: TypeScript compile check**

```bash
cd client && npx tsc --noEmit
```

Expected: no errors related to `chat-notification-toast.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/chat-notification-toast.tsx
git commit -m "feat: add ChatNotificationToast component"
```

---

### Task 2 — Wire `chat-widget.tsx`: emit toast events + handle `chat:open-window`

**Files:**
- Modify: `src/components/chat/chat-widget.tsx`

There are four precise edits needed in this file. Make them one at a time.

#### Edit A — Add `openWindowCallbackRef` with the other refs (around line 1254)

Find the block of refs starting around line 1251:
```typescript
  const loadingPeersRef = useRef(new Set<string>());
  const loadingOlderPeersRef = useRef(new Set<string>());
  const markReadInFlightRef = useRef(new Set<string>());
  const chatWindowsRef = useRef<ChatWindowState[]>([]);
```

Add ONE new ref line immediately after `chatWindowsRef`:
```typescript
  const openWindowCallbackRef = useRef<(peerUserId: string) => void>(() => {});
```

- [x] **Step 1: Add `openWindowCallbackRef` declaration**

The file after the edit should read:
```typescript
  const loadingPeersRef = useRef(new Set<string>());
  const loadingOlderPeersRef = useRef(new Set<string>());
  const markReadInFlightRef = useRef(new Set<string>());
  const chatWindowsRef = useRef<ChatWindowState[]>([]);
  const openWindowCallbackRef = useRef<(peerUserId: string) => void>(() => {});
```

#### Edit B — Assign ref + add `useEffect` immediately after `openWindow` function

`openWindow` ends around line 2756 (closing `};`). Immediately after that closing brace, add:

```typescript
  // Keep ref in sync so the chat:open-window listener always calls the latest version
  openWindowCallbackRef.current = openWindow;

  useEffect(() => {
    const handler = (e: Event) => {
      const { peerUserId } = (e as CustomEvent<{ peerUserId: string }>).detail;
      openWindowCallbackRef.current(peerUserId);
    };
    window.addEventListener("chat:open-window", handler);
    return () => window.removeEventListener("chat:open-window", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

- [x] **Step 2: Add ref sync + `chat:open-window` listener after `openWindow`**

#### Edit C — Dispatch `chat:window-opened` inside `openWindow`

`openWindow` starts at line 2721. After the early return (`if (!peerUserId) { return; }`), add:

```typescript
  const openWindow = (peerUserId: string) => {
    if (!peerUserId) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("chat:window-opened", { detail: { peerUserId } }),
    );

    setIsComposerOpen(false);
    // ... rest unchanged
```

- [x] **Step 3: Dispatch `chat:window-opened` at start of `openWindow`**

The existing code is:
```typescript
  const openWindow = (peerUserId: string) => {
    if (!peerUserId) {
      return;
    }

    setIsComposerOpen(false);
    setIsOverflowOpen(false);
```

Replace with:
```typescript
  const openWindow = (peerUserId: string) => {
    if (!peerUserId) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("chat:window-opened", { detail: { peerUserId } }),
    );

    setIsComposerOpen(false);
    setIsOverflowOpen(false);
```

#### Edit D — Dispatch `chat:toast` in the `chat:room-message` handler (general room)

Find the block at approximately line 3408–3413:
```typescript
          if (!isOwnMessage) {
            playIncomingMessageSound();
            if (isOpenAndActive) {
              markIncomingMessageAnimated(completedMessage.id);
            }
          }
```

Replace with:
```typescript
          if (!isOwnMessage) {
            playIncomingMessageSound();
            if (isOpenAndActive) {
              markIncomingMessageAnimated(completedMessage.id);
            }
            if (!isOpenAndActive) {
              const senderName =
                rawEventData?.sender?.name ||
                (completedMessage as any).sender?.name ||
                "General";
              const content = completedMessage.content || "(Attachment)";
              window.dispatchEvent(
                new CustomEvent("chat:toast", {
                  detail: { peerUserId: GENERAL_ROOM_ID, senderName, content },
                }),
              );
            }
          }
```

- [x] **Step 4: Dispatch `chat:toast` in `chat:room-message` branch**

#### Edit E — Dispatch `chat:toast` in the `chat:new-message` handler (DM)

Find the block at approximately line 3564–3579:
```typescript
        if (!isOwnMessage) {
          playIncomingMessageSound();
          if (isOpenAndActive) {
            markIncomingMessageAnimated(finalMessage.id);
          }
          if (
            isGeneralRoom(peerUserId) &&
            !isOpenAndActive &&
            messageMentionsCurrentUser(finalMessage, currentUser)
          ) {
            setRoomMentionById((current) => ({
              ...current,
              [GENERAL_ROOM_ID]: true,
            }));
          }
        }
```

Replace with:
```typescript
        if (!isOwnMessage) {
          playIncomingMessageSound();
          if (isOpenAndActive) {
            markIncomingMessageAnimated(finalMessage.id);
          }
          if (
            isGeneralRoom(peerUserId) &&
            !isOpenAndActive &&
            messageMentionsCurrentUser(finalMessage, currentUser)
          ) {
            setRoomMentionById((current) => ({
              ...current,
              [GENERAL_ROOM_ID]: true,
            }));
          }
          if (!isOpenAndActive) {
            const senderName = peerUser?.name || "Someone";
            const content = finalMessage.content || "(Attachment)";
            window.dispatchEvent(
              new CustomEvent("chat:toast", {
                detail: { peerUserId, senderName, content },
              }),
            );
          }
        }
```

- [x] **Step 5: Dispatch `chat:toast` in `chat:new-message` branch**

- [x] **Step 6: TypeScript compile check**

```bash
cd client && npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/chat/chat-widget.tsx
git commit -m "feat: emit chat toast events from ChatWidget"
```

---

### Task 3 — Render `<ChatNotificationToast />` in workspace layout

**Files:**
- Modify: `src/app/workspace/layout.tsx`

The current layout renders `<ChatWidget />` at line 70. Add `<ChatNotificationToast />` right after it.

- [x] **Step 1: Add import**

Find in `src/app/workspace/layout.tsx`:
```typescript
import ChatWidget from "@components/chat/chat-widget";
```

Replace with:
```typescript
import ChatWidget from "@components/chat/chat-widget";
import ChatNotificationToast from "@components/chat/chat-notification-toast";
```

- [x] **Step 2: Render the component**

Find:
```tsx
      <ChatWidget />
    </Layout>
```

Replace with:
```tsx
      <ChatWidget />
      <ChatNotificationToast />
    </Layout>
```

- [x] **Step 3: TypeScript compile check**

```bash
cd client && npx tsc --noEmit
```

Expected: clean compile.

- [ ] **Step 4: Commit**

```bash
git add src/app/workspace/layout.tsx
git commit -m "feat: render ChatNotificationToast in workspace layout"
```

---

### Task 4 — Smoke test

- [ ] **Step 1: Start dev server**

```bash
cd client && npm run dev
```

- [ ] **Step 2: Log in**

Navigate to `http://localhost:3000`. Log in with credentials:
- Username: `developer`
- Password: `@Devozzy1212`

- [ ] **Step 3: Verify toast appears**

From a second browser session or another user account, send a chat message to `developer`. Confirm:
1. A toast bubble appears in the bottom-right corner of the screen
2. It fades in smoothly
3. It shows the sender's name and message text
4. It auto-dismisses after ~3 seconds with a fade-out
5. Clicking the toast opens the chat window for that conversation

- [ ] **Step 4: Verify suppression**

Open the chat window for user A, then have user A send a message. Confirm no toast appears (window is already open).

- [ ] **Step 5: Verify stacking**

Have multiple users send messages simultaneously (or send to general room while it's closed). Confirm multiple toasts stack vertically above the chat widget.

- [ ] **Step 6: Verify attachment label**

Send an attachment from another user. Confirm the toast shows `(Attachment)` as the content.

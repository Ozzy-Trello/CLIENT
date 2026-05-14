# Subagent Prompt — Execute Chat Notification Toast Plan

## Your task

You are implementing the plan at:

```
client/docs/superpowers/plans/2026-04-10-chat-notification-toast.md
```

Read that file in full before doing anything else.

## Rules

1. **Work in order** — Task 1 → Task 2 → Task 3 → Task 4. Do not skip ahead.
2. **Update checkboxes as you go** — After completing each step, edit the plan file to change `- [ ]` to `- [x]` for that step. This is not optional.
3. **Follow the plan exactly** — Use the exact code shown in each step. Do not improvise, refactor, or add features not in the plan.
4. **TypeScript check after each task** — Run `npx tsc --noEmit` from the `client/` directory. Fix any errors before committing.
5. **Stop and report** if you hit an error you cannot resolve — do not guess and continue.

## Working directory

```
/Users/fishy/Desktop/work/ozzy/client
```

Verify branch before starting:

```bash
git branch --show-current
```

## Files you will touch

| Action | File |
|--------|------|
| Create | `src/components/chat/chat-notification-toast.tsx` |
| Modify | `src/components/chat/chat-widget.tsx` |
| Modify | `src/app/workspace/layout.tsx` |

**Do not touch any other file.**

## Checkpoint summary

### Task 1 — Create `ChatNotificationToast` component
- [x] Step 1: Create `src/components/chat/chat-notification-toast.tsx` with full implementation
- [x] Step 2: TypeScript compile check (`npx tsc --noEmit`)
- [ ] Step 3: Commit

### Task 2 — Wire `chat-widget.tsx`
- [x] Step 1: Add `openWindowCallbackRef` declaration with other refs (~line 1254)
- [x] Step 2: Add ref sync + `chat:open-window` listener after `openWindow` function
- [x] Step 3: Dispatch `chat:window-opened` at start of `openWindow`
- [x] Step 4: Dispatch `chat:toast` in `chat:room-message` branch (general room)
- [x] Step 5: Dispatch `chat:toast` in `chat:new-message` branch (DMs)
- [x] Step 6: TypeScript compile check
- [ ] Step 7: Commit

### Task 3 — Render in layout
- [x] Step 1: Add import to `src/app/workspace/layout.tsx`
- [x] Step 2: Render `<ChatNotificationToast />` after `<ChatWidget />`
- [x] Step 3: TypeScript compile check
- [ ] Step 4: Commit

### Task 4 — Smoke test
- [ ] Step 1: Start dev server
- [ ] Step 2: Log in
- [ ] Step 3: Verify toast appears and behaves correctly
- [ ] Step 4: Verify suppression when window is open
- [ ] Step 5: Verify stacking with multiple messages
- [ ] Step 6: Verify attachment shows `(Attachment)`

## After each step

Update the checkbox in **both** this file and `client/docs/superpowers/plans/2026-04-10-chat-notification-toast.md`.

## Done

When all steps are complete, reply with:
- Commit hashes
- TypeScript errors encountered (if any) and how they were resolved
- Any deviations from the plan and why

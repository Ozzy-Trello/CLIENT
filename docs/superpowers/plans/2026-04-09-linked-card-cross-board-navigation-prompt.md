# Subagent Prompt — Execute Linked Card Cross-Board Navigation Fix

## Your task

You are implementing the plan at:

```
docs/superpowers/plans/2026-04-09-linked-card-cross-board-navigation.md
```

Read that file in full before doing anything else.

## Context

This is a **frontend** fix in the `client/` directory of a Next.js 14 monorepo.

The bug: clicking a linked card that lives on a different board opens the card detail modal within the *current* board's context instead of navigating to the correct board. Two files need changing.

## Rules

1. **Work in order** — Task 1 (fallback fix) → Task 2 (navigation + tests). Do not skip ahead.
2. **TDD for Task 2** — Write and run tests first. Confirm the first test FAILS before writing implementation. Confirm both PASS after.
3. **Update checkboxes as you go** — After completing each step, edit the plan file to change `- [ ]` to `- [x]`.
4. **Follow the plan exactly** — Use the exact code shown. Do not refactor surrounding code or add extra features.
5. **Stop and report** if you hit a TypeScript error or test failure you cannot resolve.

## Working directory

```
/Users/fishy/Desktop/work/ozzy/client   (client app, snapshot/stable or main branch)
```

Verify you are in the client directory and on the right branch before starting:

```bash
cd /Users/fishy/Desktop/work/ozzy/client
git branch --show-current
```

## Files you will touch

| Action | File |
|--------|------|
| Modify | `src/app/workspace/[workspaceId]/board/[boardId]/card-details/attachments.tsx` |
| Modify | `src/app/workspace/[workspaceId]/board/[boardId]/card-details/attached-card.tsx` |
| Create | `src/app/workspace/[workspaceId]/board/[boardId]/card-details/attached-card-navigation.test.tsx` |

**Do not touch any other file.**

## Test command

```bash
# Run only the new tests
npm test -- attached-card-navigation --no-coverage

# Run full suite
npm test -- --no-coverage
```

## Checkpoint summary

### Task 1 — Fix fallback card data
- [x] Step 1: Remove `listId/listName/boardId/boardName` from fallback in `attachments.tsx`
- [ ] Step 2: TypeScript compile check (`npx tsc --noEmit`)
- [ ] Step 3: Commit

### Task 2 — Test + implement cross-board navigation
- [x] Step 1: Create `attached-card-navigation.test.tsx` with 2 tests
- [x] Step 2: Run tests — confirm first test FAILS (second may PASS already)
- [x] Step 3: Add `useRouter` to imports in `attached-card.tsx`
- [x] Step 4: Add `workspaceId` extraction + `router` call after `routeBoardId`
- [x] Step 5: Replace `handleClick` with cross-board-aware version
- [x] Step 6: TypeScript compile check (`npx tsc --noEmit`)
- [x] Step 7: Run tests — confirm both PASS
- [x] Step 8: Run full test suite — confirm no new failures
- [ ] Step 9: Commit

## After each step

Update the checkbox in **both** this file and `docs/superpowers/plans/2026-04-09-linked-card-cross-board-navigation.md`.

## Done

When all steps are complete, reply with:
- Both commit hashes
- Test output summary (X passed, Y failed)
- Any TypeScript errors encountered and how they were resolved
- Any deviations from the plan and why

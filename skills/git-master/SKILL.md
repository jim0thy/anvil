---
name: git-master
description: Guide for advanced Git operations. Use when asked about branching, rebasing, conflict resolution, commit conventions, or complex Git workflows.
---

## Branching Strategies

- **GitFlow**: Use `main` (production), `develop` (integration), `feature/*`, `release/*`, and `hotfix/*` branches. Merge features into develop, cut releases from develop, hotfix from main.
- **Trunk-based**: Commit to `main` via short-lived feature branches (<1 day). Use feature flags for incomplete work. Prefer this for CI/CD-heavy teams.

## Interactive Rebase

Run `git rebase -i HEAD~N` to squash, reword, reorder, or drop commits. Use `fixup` to silently squash. Never rebase commits already pushed to shared branches unless coordinated.

## Conflict Resolution

1. Run `git status` to identify conflicted files.
2. Open files, look for `<<<<<<<`, `=======`, `>>>>>>>` markers.
3. Choose the correct code (or merge both), remove markers.
4. `git add <file>` then `git rebase --continue` or `git merge --continue`.
5. Use `git mergetool` for complex conflicts. Configure a visual tool like VS Code or kdiff3.

## Conventional Commits

Format: `type(scope): description`. Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`. Breaking changes: add `!` after type or `BREAKING CHANGE:` in footer.

## Git Bisect

Run `git bisect start`, `git bisect bad` (current), `git bisect good <sha>`. Git binary-searches commits. Test each, mark `good`/`bad`. End with `git bisect reset`. Automate: `git bisect run <test-script>`.

## Cherry-Pick & Stash

- Cherry-pick: `git cherry-pick <sha>` to apply a single commit. Use `-x` to note the source. Resolve conflicts if needed.
- Stash: `git stash push -m "description"`. List with `git stash list`. Apply with `git stash pop` or `git stash apply stash@{n}`.

## Safety & Recovery

- **Force push safely**: Always use `git push --force-with-lease` instead of `--force`. It fails if the remote has new commits you haven't fetched.
- **Reflog recovery**: `git reflog` shows all HEAD movements. Find the lost commit SHA and `git checkout <sha>` or `git reset --hard <sha>` to recover.
- **Branch cleanup**: `git branch --merged | grep -v main | xargs git branch -d` to delete merged local branches. `git remote prune origin` to clean stale remote refs.
- **Squash merging**: Use `git merge --squash <branch>` to combine all branch commits into one. Ideal for keeping main history clean.

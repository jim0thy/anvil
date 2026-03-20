#!/bin/bash
# boulder.sh — Todo continuation enforcer ("the boulder that keeps rolling").
# Runs as a userPromptSubmitted hook to remind about incomplete tasks.
# Queries the Copilot SQL todos table used by anvil agents.
# Always exits 0.

set -euo pipefail

cat <<'BOULDER'
🪨 Boulder check — before proceeding, query the SQL todos table for outstanding work:

```sql
SELECT t.id, t.title, t.status FROM todos t
WHERE t.status IN ('pending', 'in_progress', 'blocked')
ORDER BY
  CASE t.status WHEN 'in_progress' THEN 0 WHEN 'blocked' THEN 1 ELSE 2 END,
  t.created_at ASC;
```

If there are in_progress or pending todos:
- Briefly remind the user what's outstanding before addressing their new message.
- If their message relates to an existing todo, update its status to 'in_progress' and work on it.
- If their message is unrelated, acknowledge the outstanding work and proceed with the new request.
If the query returns no rows or the table doesn't exist yet, carry on silently.
BOULDER

exit 0

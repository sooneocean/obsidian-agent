Show project status overview dashboard.

Usage: `[type] [--tag TAG]`

Run: `obsidian-agent status [type] [--tag TAG]`

If the CLI is not available:
1. Scan all project and area notes (or filter by type)
2. Group by status (active, draft, archived)
3. For each note, count TODO checkboxes for progress
4. Extract deadline from frontmatter
5. Flag overdue items (deadline passed + still active)
6. Display grouped table with progress, deadline, summary

$ARGUMENTS

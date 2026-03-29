/**
 * status — project status overview dashboard
 */
import { Vault } from '../vault.mjs';

function parseTodoProgress(body) {
  if (!body) return null;
  const done = (body.match(/- \[x\]/gi) || []).length;
  const open = (body.match(/- \[ \]/g) || []).length;
  const total = done + open;
  if (total === 0) return null;
  return { done, open, total, percent: Math.round((done / total) * 100) };
}

export function status(vaultRoot, { type, tag } = {}) {
  const vault = new Vault(vaultRoot);
  const notes = vault.scanNotes({ includeBody: true });

  // Default: show projects and areas (types with meaningful lifecycle status)
  let filtered = notes;
  if (type) {
    filtered = filtered.filter(n => n.type === type);
  } else {
    filtered = filtered.filter(n => n.type === 'project' || n.type === 'area');
  }
  if (tag) {
    filtered = filtered.filter(n => n.tags.includes(tag));
  }

  // Enrich with goal, deadline, and TODO progress
  const today = new Date().toISOString().slice(0, 10);
  const enriched = filtered.map(n => {
    const content = vault.read(n.dir, `${n.file}.md`) || '';
    const fm = vault.parseFrontmatter(content);
    const todo = parseTodoProgress(n.body);
    const goal = fm.goal || '';
    const deadline = fm.deadline || '';
    const overdue = deadline && deadline < today && n.status === 'active';
    return { ...n, body: undefined, goal, deadline, todo, overdue };
  });

  // Group by status
  const groups = {};
  for (const n of enriched) {
    const s = n.status || 'unknown';
    if (!groups[s]) groups[s] = [];
    groups[s].push(n);
  }

  // Sort each group: overdue first, then by updated descending
  for (const arr of Object.values(groups)) {
    arr.sort((a, b) => {
      if (a.overdue && !b.overdue) return -1;
      if (!a.overdue && b.overdue) return 1;
      return (b.updated || '').localeCompare(a.updated || '');
    });
  }

  // Display order: active first, then draft, then archived, then anything else
  const ORDER = ['active', 'draft', 'archived'];
  const sortedStatuses = [
    ...ORDER.filter(s => groups[s]),
    ...Object.keys(groups).filter(s => !ORDER.includes(s)),
  ];

  // Summary counts
  const total = enriched.length;
  const counts = {};
  for (const [s, arr] of Object.entries(groups)) counts[s] = arr.length;
  const overdueCount = enriched.filter(n => n.overdue).length;

  // Console output
  console.log(`\nProject Status Overview\n`);
  const countLine = Object.entries(counts).map(([s, c]) => `${s}: ${c}`).join(' | ');
  console.log(`Total: ${total} | ${countLine}${overdueCount ? ` | OVERDUE: ${overdueCount}` : ''}\n`);

  for (const s of sortedStatuses) {
    const items = groups[s];
    console.log(`── ${s.toUpperCase()} (${items.length}) ──`);
    console.log('| File | Title | Type | Tags | Progress | Deadline | Summary |');
    console.log('|------|-------|------|------|----------|----------|---------|');
    for (const n of items) {
      const tags = n.tags.length ? n.tags.join(', ') : '-';
      const progress = n.todo ? `${n.todo.done}/${n.todo.total} (${n.todo.percent}%)` : '-';
      const deadline = n.deadline ? (n.overdue ? `**${n.deadline}** ⚠` : n.deadline) : '-';
      console.log(`| [[${n.file}]] | ${n.title} | ${n.type} | ${tags} | ${progress} | ${deadline} | ${n.summary || '-'} |`);
    }
    console.log('');
  }

  if (!total) {
    console.log('No projects or areas found.');
  }

  return { total, counts, overdueCount, groups };
}

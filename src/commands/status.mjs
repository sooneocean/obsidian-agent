/**
 * status — project status overview dashboard
 */
import { Vault } from '../vault.mjs';

export function status(vaultRoot, { type, tag } = {}) {
  const vault = new Vault(vaultRoot);
  const notes = vault.scanNotes();

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

  // Group by status
  const groups = {};
  for (const n of filtered) {
    const s = n.status || 'unknown';
    if (!groups[s]) groups[s] = [];
    groups[s].push(n);
  }

  // Sort each group by updated descending
  for (const arr of Object.values(groups)) {
    arr.sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));
  }

  // Display order: active first, then draft, then archived, then anything else
  const ORDER = ['active', 'draft', 'archived'];
  const sortedStatuses = [
    ...ORDER.filter(s => groups[s]),
    ...Object.keys(groups).filter(s => !ORDER.includes(s)),
  ];

  // Summary counts
  const total = filtered.length;
  const counts = {};
  for (const [s, arr] of Object.entries(groups)) counts[s] = arr.length;

  // Console output
  console.log(`\nProject Status Overview\n`);
  console.log(`Total: ${total} | ${Object.entries(counts).map(([s, c]) => `${s}: ${c}`).join(' | ')}\n`);

  for (const s of sortedStatuses) {
    const items = groups[s];
    console.log(`── ${s.toUpperCase()} (${items.length}) ──`);
    console.log('| File | Title | Type | Tags | Summary | Updated |');
    console.log('|------|-------|------|------|---------|---------|');
    for (const n of items) {
      const tags = n.tags.length ? n.tags.join(', ') : '-';
      console.log(`| [[${n.file}]] | ${n.title} | ${n.type} | ${tags} | ${n.summary || '-'} | ${n.updated} |`);
    }
    console.log('');
  }

  if (!total) {
    console.log('No projects or areas found.');
  }

  return { total, counts, groups };
}

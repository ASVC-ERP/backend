// Small text-fitting helpers shared by anything that lays out printed text
// in a fixed-width area (the invoice SVG template's terms paragraph and
// item descriptions).

// ESC/P text is single-byte ASCII/codepage, not UTF-8 — a Unicode ellipsis
// (…) would encode as garbage on the printer, so this uses three plain
// dots instead. (The SVG template renders as an image, not raw ESC/P text,
// but keeping one truncation convention everywhere avoids a second, subtly
// different "…" showing up only in printed graphics mode.)
export function truncate(s: string, maxChars: number): string {
  if (s.length <= maxChars) return s;
  if (maxChars <= 3) return s.slice(0, maxChars);
  return s.slice(0, maxChars - 3) + '...';
}

// Word-wraps to a max line width, hard-breaking any single word longer
// than the width so a run of characters with no spaces can't overflow.
export function wrapText(s: string, maxChars: number): string[] {
  const words = s.split(' ').filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    current = word.length > maxChars ? word.slice(0, maxChars) : word;
  }
  if (current) lines.push(current);

  return lines.length > 0 ? lines : [''];
}

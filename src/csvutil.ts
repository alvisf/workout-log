export function parseCsv(text: string): { row: string[]; line: number }[] {
  const out: { row: string[]; line: number }[] = [];
  let row: string[] = [], cur = '', inQ = false, line = 1, start = 1;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; } else { if (c === '\n') line++; cur += c; } }
    else if (c === '"') inQ = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.length > 1 || row[0] !== '') out.push({ row, line: start });
      row = []; line++; start = line;
    } else cur += c;
  }
  if (cur !== '' || row.length) { row.push(cur); out.push({ row, line: start }); }
  return out;
}
export const q = (v: string | number | null) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
export const toCsv = (rows: (string | number | null)[][]) => rows.map((r) => r.map(q).join(',')).join('\r\n') + '\r\n';
export async function saveFile(name: string, mime: string, content: string) {
  const file = new File([content], name, { type: mime });
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS && navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: name }); return; } catch { /* fallback */ } }
  const url = URL.createObjectURL(file); const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
}

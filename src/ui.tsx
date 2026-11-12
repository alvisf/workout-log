import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sheet, Toggle as F7Toggle } from 'framework7-react';
import { t } from './i18n';

export function useNow(active: boolean, ms = 250): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [active, ms]);
  return now;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const inst = useRef<{ opened?: boolean; destroyed?: boolean; close: (animate?: boolean) => void } | null>(null);
  const unmounting = useRef(false);
  // Runs before the F7 Sheet's own cleanup destroys it. Destroying an open sheet
  // leaves F7's app click handler behind, which then throws on every click.
  useLayoutEffect(() => () => {
    unmounting.current = true;
    const s = inst.current;
    if (s && !s.destroyed && s.opened) s.close(false);
  }, []);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    return () => {
      cancelAnimationFrame(id);
      // Parent may unmount us without closing: clear F7's shared backdrop state.
      document.querySelectorAll('.sheet-backdrop').forEach((b) => b.classList.remove('backdrop-in'));
      document.documentElement.classList.remove('with-modal-sheet');
    };
  }, []);
  // Framework7 moves an open sheet into the app root. Render it there ourselves, so
  // React's parent matches the real DOM parent and unmount doesn't throw removeChild.
  const root = document.querySelector('.framework7-root') ?? document.body;
  return createPortal(
    <Sheet opened={open} className="modal" backdrop closeByBackdropClick closeOnEscape swipeToClose onSheetOpen={(s: unknown) => { inst.current = s as typeof inst.current; }} onSheetClosed={() => { if (!unmounting.current) onClose(); }} aria-label={title}>
      <div className="modal-handle" aria-hidden="true" />
      <div className="modal-body">
        <h2>{title}</h2>
        {children}
      </div>
    </Sheet>,
    root,
  );
}

export function NumInput({ value, min, max, onChange, label }: {
  value: number; min: number; max: number; onChange: (n: number) => void; label: string;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);
  return (
    <input
      type="number" inputMode="numeric" min={min} max={max} value={draft} aria-label={label}
      onChange={(e) => {
        setDraft(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value !== '' && Number.isInteger(n) && n >= min && n <= max) onChange(n);
      }}
      onBlur={() => setDraft(String(value))}
    />
  );
}

export function Toggle({ checked, onChange, label, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean;
}) {
  return (
    <label className="row switch">
      <span>{label}</span>
      <F7Toggle checked={checked} disabled={disabled} onToggleChange={(v: boolean) => onChange(v)} />
    </label>
  );
}


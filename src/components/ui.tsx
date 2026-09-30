"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useId, type ButtonHTMLAttributes, type SubmitEvent, type FormHTMLAttributes, type ReactNode } from "react";
import { Moon, Sun, Monitor, AlertCircle } from "lucide-react";

export function Button({ variant = "secondary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "echo" | "secondary" | "ghost" | "danger" | "icon" }) {
  return <button className={`mp-button mp-button-${variant} ${className}`} {...props} />;
}

export function Skeleton({ label = "Loading your thoughts" }: { label?: string }) {
  return <div role="status" aria-label={label} className="mp-skeleton-list">{[0,1,2].map(n => <div className="mp-skeleton" key={n}><span /><span /><span /></div>)}</div>;
}

function subscribeTheme(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("mp-theme", listener);
  return () => { window.removeEventListener("storage", listener); window.removeEventListener("mp-theme", listener); };
}
function readTheme() { try { return localStorage.getItem("mind-palace-theme") || "system"; } catch { return "system"; } }
export function ThemeToggle() {
  const choice = useSyncExternalStore(subscribeTheme, readTheme, () => "system");
  const Icon = choice === "dark" ? Moon : choice === "light" ? Sun : Monitor;
  return <Button variant="icon" aria-label={`Theme: ${choice}. Change theme`} title={`Theme: ${choice}. Change theme`} onClick={() => {
    const next = choice === "system" ? "dark" : choice === "dark" ? "light" : "system";
    try { localStorage.setItem("mind-palace-theme", next); } catch { /* Storage may be blocked. */ }
    window.dispatchEvent(new Event("mp-theme"));
    document.documentElement.dataset.theme = next === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : next;
  }}><Icon size={20} aria-hidden="true" /></Button>;
}

export function ThemeListener() {
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      let choice = "system";
      try { choice = localStorage.getItem("mind-palace-theme") || "system"; } catch { /* System mode remains available. */ }
      document.documentElement.dataset.theme = choice === "system" ? media.matches ? "dark" : "light" : choice;
    };
    media.addEventListener("change", apply);
    window.addEventListener("storage", apply);
    return () => { media.removeEventListener("change", apply); window.removeEventListener("storage", apply); };
  }, []);
  return null;
}

// Keep HTML constraint rules but render errors inline, without native bubbles.
export function ValidatedForm({ children, onSubmit, ...props }: FormHTMLAttributes<HTMLFormElement> & { children: ReactNode }) {
  const [error, setError] = useState("");
  const errorId = useId();
  function submit(event: SubmitEvent<HTMLFormElement>) {
    const invalid = Array.from(event.currentTarget.elements).find(el => (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) && !el.validity.valid) as HTMLInputElement | undefined;
    if (invalid) {
      event.preventDefault();
      invalid.setAttribute("aria-invalid", "true");
      invalid.setAttribute("aria-describedby", errorId);
      invalid.focus();
      setError(invalid.validationMessage);
      return;
    }
    setError("");
    onSubmit?.(event);
  }
  return <form {...props} noValidate onSubmit={submit} onInput={event => { (event.target as HTMLElement).removeAttribute("aria-invalid"); (event.target as HTMLElement).removeAttribute("aria-describedby"); setError(""); }}>
    {children}
    {error ? <p className="mp-field-error" id={errorId} role="alert"><AlertCircle size={16} aria-hidden="true" />{error}</p> : null}
  </form>;
}

export function useModalFocus(onClose: () => void) {
  const ref = useRef<HTMLElement>(null);
  const originalFocus = useRef<HTMLElement | null>(typeof document !== "undefined" ? document.activeElement as HTMLElement : null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    const trigger = originalFocus.current;
    const panel = ref.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => Array.from(panel?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]') || []).filter(el => el.getClientRects().length > 0);
    const start = requestAnimationFrame(() => { if (!panel?.contains(document.activeElement)) focusable()[0]?.focus(); });
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close.current(); }
      if (event.key === "Tab") {
        const items = focusable();
        const first = items[0]; const last = items.at(-1);
        if (event.shiftKey && (document.activeElement === first || !panel?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", key);
    return () => { cancelAnimationFrame(start); document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", key); if (trigger?.isConnected) trigger.focus(); };
  }, []);
  return ref;
}

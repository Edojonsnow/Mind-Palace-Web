"use client";

import { useState } from "react";
import { LockKeyhole, Sparkles, X, ArrowRight } from "lucide-react";
import { Button, Skeleton, ThemeToggle, ValidatedForm } from "./ui";

const colors = ["bg","bg-raised","surface","surface-2","surface-3","text","text-2","text-3","lumen","lumen-text","echo","vault","danger"];
export function DesignSystem() {
  const [on, setOn] = useState(false);
  return <main className="mx-auto w-full max-w-7xl px-5 py-10">
    <header className="mb-10 flex items-center justify-between"><h1 className="text-display-lg">The Lamplit Palace</h1><ThemeToggle /></header>
    <p className="mb-10 text-muted">Development reference. Amber is yours. Violet is AI. Verdigris is private.</p>
    <div className="grid gap-10 lg:grid-cols-2">{(["dark","light"] as const).map(theme => <section key={theme} data-theme={theme} className="rounded-3xl bg-ink p-6 text-copy shadow-e1">
      <h2 className="mb-6 text-3xl">{theme === "dark" ? "Nocturne" : "Vellum"}</h2>
      <div className="grid grid-cols-3 gap-3">{colors.map(color => <div key={color}><div className="mb-2 h-12 rounded-lg shadow-e1" style={{background: `var(--mp-${color})`}} /><code className="text-xs">{color}</code></div>)}</div>
      <h3 className="mb-4 mt-8 text-2xl">Typography</h3><p className="font-serif text-3xl">Your words, kept close.</p><p className="my-3 font-sans">System copy and AI answers.</p>
      <h3 className="mb-4 mt-8 text-2xl">Actions</h3><div className="flex flex-wrap gap-3"><Button variant="primary">Keep this thought <ArrowRight size={16} /></Button><Button variant="echo">Ask →</Button><Button>Secondary</Button><Button variant="ghost">Ghost</Button><Button variant="danger">Delete</Button><Button variant="icon" aria-label="Close"><X size={18} /></Button><Button disabled>Disabled</Button></div>
      <h3 className="mb-4 mt-8 text-2xl">Fields and consent</h3><ValidatedForm onSubmit={e => e.preventDefault()}><label className="mp-auth-label">Thought title<input className="mp-field mt-2" required placeholder="A thought to keep" /></label><Button type="submit">Validate</Button></ValidatedForm>
      <label className="mt-5 flex min-h-11 items-center justify-between gap-4">Let Ask My Mind use this<input type="checkbox" checked={on} onChange={e => setOn(e.target.checked)} /></label>
      <div className="mt-5 flex gap-3"><span className="mp-tag">reflection</span><span className="flex items-center gap-2 text-vault"><LockKeyhole size={16} />Private</span><span className="flex items-center gap-2 text-echo"><Sparkles size={16} />Ask My Mind</span></div>
      <h3 className="mb-4 mt-8 text-2xl">Loading and empty</h3><Skeleton /><div className="mp-empty"><h2>Nothing matches yet.</h2><p>Try describing it differently.</p></div>
    </section>)}</div>
  </main>;
}

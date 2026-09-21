import { ArrowUpRight, MessageCircleQuestion, Search, Sprout, PenLine } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BrainAction } from "@/lib/brain-scene";
import { InteractiveBrain } from "./interactive-brain";
import styles from "./mind-map-home.module.css";

type MindMapHomeProps = {
  showAskAction: boolean;
  onSaveThought: () => void;
  onAskMind: () => void;
  onSearchThoughts: () => void;
  onReminisce: () => void;
};

const actions = [
  { title: "Save a thought", detail: "Just let it land.", icon: PenLine, action: "save" },
  { title: "Ask my mind", detail: "Make a connection.", icon: MessageCircleQuestion, action: "ask" },
  { title: "Recall", detail: "Find your way back.", icon: Search, action: "search" },
  { title: "View thoughts", detail: "See what takes shape.", icon: Sprout, action: "reminisce" },
] as const;

export function MindMapHome({ showAskAction, onSaveThought, onAskMind, onSearchThoughts, onReminisce }: MindMapHomeProps) {
  const [brainReady, setBrainReady] = useState(false);
  const [hovered, setHovered] = useState<BrainAction | null>(null);
  const [focused, setFocused] = useState<BrainAction | null>(null);
  const [selected, setSelected] = useState<BrainAction | null>(null);
  const pendingAction = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onBrainReady = useCallback(() => setBrainReady(true), []);
  const activeAction = hovered ?? focused ?? selected;
  const cardActiveAction = hovered ?? focused;
  const actionHandlers = { save: onSaveThought, ask: onAskMind, search: onSearchThoughts, reminisce: onReminisce };

  useEffect(() => () => { if (pendingAction.current) clearTimeout(pendingAction.current); }, []);

  function choose(action: BrainAction) {
    if (pendingAction.current) return;
    setSelected(action);
    // One small acknowledgment on touch as well as desktop; never a second click.
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 160;
    pendingAction.current = setTimeout(() => {
      pendingAction.current = null;
      actionHandlers[action]();
    }, delay);
  }

  return (
    <div className={styles.home}>
      <header className={styles.intro}>
        <h1>A thought is all it takes.</h1>
        <p>Save it here. Find it when you need it.</p>
      </header>
      <div className={styles.stage} data-ready={brainReady} data-active={activeAction ?? "none"}>
        <div className={styles.brainEntrance}>
          <InteractiveBrain activeAction={activeAction} onReady={onBrainReady} />
        </div>
        {actions.filter((action) => action.action !== "ask" || showAskAction).map((action) => {
          const Icon = action.icon;
          return (
            <div key={action.action} className={`${styles.actionPosition} ${styles[action.action]}`}>
              <button className={styles.action} type="button" onClick={() => choose(action.action)}
                onPointerEnter={(event) => { if (event.pointerType !== "touch") setHovered(action.action); }}
                onPointerLeave={() => setHovered(null)} onFocus={() => setFocused(action.action)} onBlur={() => setFocused(null)}
                data-active={cardActiveAction === action.action}>
                <span className={styles.actionTop} aria-hidden="true"><Icon size={19} strokeWidth={1.35} /><ArrowUpRight className={styles.arrow} size={16} strokeWidth={1.35} /></span>
                <span className={styles.actionTitle}>{action.title}</span>
                <span className={styles.actionDetail}>{action.detail}</span>
              </button>
            </div>
          );
        })}
      </div>
      <footer className={styles.footer}>
        <details className={styles.about}>
          <summary>About this view</summary>
          <p>A small nod to how we think: memory, connection, and imagination. The highlights are illustrative; these abilities involve overlapping brain networks.</p>
          <p>Brain anatomy: <a href="https://github.com/itayinbarr/brainproject" target="_blank" rel="noreferrer">Brain Project</a>, Z-Anatomy / BodyParts3D © DBCLS. Adapted under <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>. <a href="/models/brain/ATTRIBUTION.md">Full credits</a>.</p>
        </details>
      </footer>
    </div>
  );
}

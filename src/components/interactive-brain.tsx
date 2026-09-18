"use client";

import { useEffect, useRef, useState } from "react";
import { Brain, RotateCcw } from "lucide-react";
import type { BrainAction, BrainScene } from "@/lib/brain-scene";
import styles from "./mind-map-home.module.css";

type Props = { activeAction: BrainAction | null; onReady: () => void };

export function InteractiveBrain({ activeAction, onReady }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<BrainScene | null>(null);
  const active = useRef(activeAction);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    active.current = activeAction;
    controller.current?.highlight(activeAction);
  }, [activeAction]);

  useEffect(() => {
    let cancelled = false;
    const fail = () => {
      if (cancelled) return;
      setStatus("unavailable");
      onReady();
      controller.current?.dispose();
      controller.current = null;
    };
    import("@/lib/brain-scene").then(({ createBrainScene }) => {
      if (cancelled || !host.current) return;
      try {
        controller.current = createBrainScene(host.current, () => {
          if (cancelled) return;
          setStatus("ready");
          controller.current?.highlight(active.current);
          onReady();
        }, fail);
      } catch { fail(); }
    }).catch(fail);
    return () => { cancelled = true; controller.current?.dispose(); controller.current = null; };
  }, [onReady]);

  return (
    <div className={styles.brainInteractive} data-status={status}>
      <div ref={host} className={styles.brainCanvas} role="group" tabIndex={status === "ready" ? 0 : -1}
        aria-label="Rotatable 3D brain. Drag to rotate, or use arrow keys. Press Home to reset."
        onKeyDown={(event) => {
          const directions: Record<string, [number, number]> = { ArrowLeft: [-0.18, 0], ArrowRight: [0.18, 0], ArrowUp: [0, -0.18], ArrowDown: [0, 0.18] };
          if (event.key === "Home") { event.preventDefault(); controller.current?.reset(); }
          else if (directions[event.key]) { event.preventDefault(); controller.current?.rotate(...directions[event.key]); }
        }} />
      {status !== "ready" ? <div className={styles.brainFallback} aria-live="polite"><Brain size={72} strokeWidth={0.65} aria-hidden="true" /><span>{status === "loading" ? "A moment for your mind…" : "Your thoughts are still a click away."}</span></div> : null}
      {status === "ready" ? <div className={styles.brainTools}><span>Drag to explore</span><button type="button" onClick={() => controller.current?.reset()} aria-label="Reset brain rotation"><RotateCcw size={13} aria-hidden="true" /></button></div> : null}
    </div>
  );
}

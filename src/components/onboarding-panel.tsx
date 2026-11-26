"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, NotebookPen, UserRound } from "lucide-react";
import type { UserSettings } from "@/lib/api";
import styles from "./onboarding-panel.module.css";

type OnboardingPanelProps = {
  step: UserSettings["onboarding_step"];
  isBusy: boolean;
  errorMessage: string;
  onContinue: () => void;
  onSkip: () => void;
  onSaveThought: () => void;
  onProfile: () => void;
};

export function OnboardingPanel({
  step, isBusy, errorMessage, onContinue, onSkip, onSaveThought, onProfile,
}: OnboardingPanelProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [step]);
  const isPrivacy = step === "privacy";

  return (
    <section className={styles.panel} aria-labelledby="onboarding-title" aria-busy={isBusy}>
      <header className={styles.header}>
        <ol className={styles.progress} aria-label="Setup progress">
          <li aria-current={isPrivacy ? "step" : undefined}>Privacy</li>
          <li aria-current={!isPrivacy ? "step" : undefined}>First thought</li>
        </ol>
        <button className="mp-button mp-button-ghost" type="button" disabled={isBusy} onClick={onSkip}>Skip setup</button>
      </header>
      <h1 ref={heading} tabIndex={-1} id="onboarding-title" className={styles.title}>
        {isPrivacy ? "Your thoughts. Your terms." : "Catch a thought before it slips away."}
      </h1>
      {isPrivacy ? (
        <dl className={styles.privacy}>
          <div><dt>A library that goes with you</dt><dd>Your thoughts are saved to your account in the cloud, ready whenever you sign in. Storage is not end-to-end encrypted; the service can read your saved thoughts.</dd></div>
          <div><dt>AI by invitation, not by default</dt><dd>AI starts off. Only thoughts you enable are sent to an external AI provider for processing and use with Ask Omini. You can change that choice for each thought.</dd></div>
          <div><dt>Keep control beyond the first save</dt><dd>Export your archive, change AI participation, or delete your account in Privacy &amp; data. Deleted thoughts stay recoverable until their recovery window ends.</dd></div>
        </dl>
      ) : (
        <p className={styles.intro}>An idea for later, a moment from today, a passage that stays with you. Start with a few words; you can edit your thought, add tags, or group it into a collection whenever you&apos;re ready.</p>
      )}
      {errorMessage ? <p className={styles.error} role="alert">{errorMessage}</p> : null}
      <footer className={styles.actions}>
        <button key={step} className="mp-button mp-button-primary" type="button" disabled={isBusy} onClick={isPrivacy ? onContinue : onSaveThought}>
          {isPrivacy ? "Continue" : "Save a thought"}
          {isPrivacy ? <ArrowRight size={18} aria-hidden="true" /> : <NotebookPen size={18} aria-hidden="true" />}
        </button>
        {!isPrivacy ? <button className="mp-button mp-button-ghost" type="button" disabled={isBusy} onClick={onProfile}><UserRound size={18} aria-hidden="true" />Set up profile (optional)</button> : null}
        {isBusy ? <span role="status">Saving...</span> : null}
      </footer>
    </section>
  );
}

import type { FormEvent } from "react";
import { ArrowUpRight, Search, ChevronDown } from "lucide-react";
import type { AskMessage, AskSource } from "@/lib/api";
import { Button } from "./ui";
import styles from "./ask-my-mind-workspace.module.css";

type AskMyMindWorkspaceProps = {
  messages: AskMessage[]; question: string; isAsking: boolean; errorMessage: string;
  sources: AskSource[]; onQuestionChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void; onSourceOpen: (source: AskSource) => void;
};

function SourceCards({ sources, onOpen }: { sources: AskSource[]; onOpen: (source: AskSource) => void }) {
  return <div className={styles.sourceList}>{sources.map(source => {
    const title = source.title ?? source.source_title ?? "Saved thought";
    return <button className={styles.source} key={source.chunk_id} type="button" aria-label={`Open thought: ${title}`} onClick={() => onOpen(source)}>
      <span className="mp-eyebrow">{source.citation_label}</span>
      <h2>{title}</h2><p>{source.snippet}</p>
      <span className={styles.sourceLink}>Open thought <ArrowUpRight size={16} aria-hidden="true" /></span>
    </button>;
  })}</div>;
}

export function AskMyMindWorkspace({ messages, question, isAsking, errorMessage, sources, onQuestionChange, onSubmit, onSourceOpen }: AskMyMindWorkspaceProps) {
  return <div className={`mp-ask ${styles.workspace}`}>
    <header className={styles.header}><h1 className="text-display-lg">A conversation grounded in you.</h1></header>
    <div className={styles.layout}>
      <div className={styles.conversation}>
        <div className={styles.messages} role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions">
          {messages.length === 0 ? <div className={styles.empty}><Search size={28} aria-hidden="true" /><h2>Your thoughts, in conversation.</h2><p>Ask about a pattern, decision, person, or idea you have written about.</p></div> : messages.map(message => <article key={message.id} className={message.role === "user" ? styles.question : styles.answer}>
            <p className="mp-eyebrow">{message.role === "user" ? "You" : "Ask my mind"}</p>
            <div className={styles.content}>{message.content}</div>
            {message.role === "assistant" ? <>
              <div className={styles.evidence}>{message.citations.length ? <><span className={styles.evidenceDot} />{new Set(message.citations.map(s => s.thought_id)).size} {new Set(message.citations.map(s => s.thought_id)).size === 1 ? "thought cited" : "thoughts cited"}</> : "No supporting thoughts cited"}</div>
              {message.citations.length ? <details className={styles.mobileSources}><summary>View sources ({message.citations.length})<ChevronDown size={16} /></summary><SourceCards sources={message.citations} onOpen={onSourceOpen} /></details> : null}
            </> : null}
          </article>)}
          {isAsking ? <div className={styles.searching} role="status"><p className="mp-eyebrow">Searching your thoughts…</p><div className={styles.shimmer} /></div> : null}
        </div>
        <form className={styles.composer} onSubmit={onSubmit}>
          <label className="sr-only" htmlFor="ask-question">Ask your mind</label>
          <textarea id="ask-question" className={styles.input} placeholder="Ask something only your mind could answer…" value={question} onChange={event => onQuestionChange(event.target.value)} rows={2} maxLength={5000} disabled={isAsking} onKeyDown={event => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              if (question.trim() && !isAsking) event.currentTarget.form?.requestSubmit();
            }
          }} />
          <Button variant="echo" type="submit" disabled={!question.trim() || isAsking}>Ask →</Button>
        </form>
        {errorMessage ? <p className={styles.error} role="alert">{errorMessage}</p> : null}
      </div>
      <aside className={styles.sources}><p className="mp-eyebrow">Sources / {sources.length}</p>
        {sources.length === 0 ? <p className={styles.helper}>Citations appear here with the exact thoughts used.</p> : <SourceCards sources={sources} onOpen={onSourceOpen} />}
      </aside>
    </div>
  </div>;
}

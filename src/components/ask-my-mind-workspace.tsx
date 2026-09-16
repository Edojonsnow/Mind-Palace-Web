import type { FormEvent } from "react";

import type { AskMessage, AskSource } from "@/lib/api";

type AskMyMindWorkspaceProps = {
  messages: AskMessage[];
  question: string;
  isAsking: boolean;
  errorMessage: string;
  sources: AskSource[];
  onQuestionChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function AskMyMindWorkspace({
  messages,
  question,
  isAsking,
  errorMessage,
  sources,
  onQuestionChange,
  onSubmit,
}: AskMyMindWorkspaceProps) {
  return (
    <div className="w-full max-w-5xl">
      <div className="mb-8 max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#35a79f]">[ Ask my mind / 02 ]</p>
        <h1 className="mt-4 font-display text-5xl font-medium tracking-[-0.055em] text-[#202329] sm:text-6xl">A conversation grounded in you.</h1>
      </div>
      <div className="grid min-h-[520px] overflow-hidden rounded-[30px] border border-black/[0.08] bg-white/80 shadow-[0_30px_90px_rgba(31,35,45,0.1)] backdrop-blur-xl lg:grid-cols-[1fr_300px]">
        <div className="flex min-h-0 flex-col border-b border-black/[0.07] lg:border-b-0 lg:border-r">
          <div className="flex-1 space-y-4 overflow-y-auto p-5 sm:p-7">
            {messages.length === 0 ? <p className="max-w-md font-display text-2xl leading-9 tracking-[-0.025em] text-[#90949c]">Ask about a pattern, decision, person, or idea you have written about.</p> : messages.map((message) => (
              <div key={message.id} className={message.role === "user" ? "ml-auto max-w-[80%] rounded-[20px] bg-[#24272d] px-5 py-4 text-sm leading-6 text-white" : "max-w-[88%] border-l border-[#6f7fd8] pl-5 text-sm leading-7 text-[#343840]"}>{message.content}</div>
            ))}
            {isAsking ? <p className="text-xs uppercase tracking-[0.14em] text-[#8b909a]">Looking through your thoughts…</p> : null}
          </div>
          <form className="m-4 flex items-end gap-3 rounded-[22px] border border-black/[0.09] bg-[#f4f4f1] p-2 sm:m-5" onSubmit={onSubmit}>
            <textarea className="min-h-12 flex-1 resize-none bg-transparent px-3 py-3 text-sm leading-6 outline-none" placeholder="Ask something only your mind could answer…" value={question} onChange={(event) => onQuestionChange(event.target.value)} rows={2} maxLength={5000} disabled={isAsking} />
            <button className="h-11 rounded-full bg-[#24272d] px-5 text-xs font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-35" type="submit" disabled={!question.trim() || isAsking}>Ask →</button>
          </form>
          {errorMessage ? <p className="mx-5 mb-4 text-xs leading-5 text-[#bb454f]">{errorMessage}</p> : null}
        </div>
        <aside className="bg-[#f3f3f0]/70 p-5 sm:p-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8d929c]">Sources / {sources.length}</p>
          <div className="mt-5 space-y-5">{sources.length === 0 ? <p className="text-sm leading-6 text-[#8b909a]">Citations appear here with the exact thoughts used.</p> : sources.map((source) => <article key={source.chunk_id}><span className="text-[10px] font-semibold tracking-[0.12em] text-[#6f7fd8]">{source.citation_label}</span><h2 className="mt-1 text-sm font-semibold text-[#30343b]">{source.title ?? source.source_title ?? "Untitled thought"}</h2><p className="mt-1 line-clamp-4 text-xs leading-5 text-[#737984]">{source.snippet}</p></article>)}</div>
        </aside>
      </div>
    </div>
  );
}

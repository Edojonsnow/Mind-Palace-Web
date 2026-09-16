import { MessageCircleQuestion, Save, Search, Sparkles } from "lucide-react";

type MindMapHomeProps = {
  showAskAction: boolean;
  onSaveThought: () => void;
  onAskMind: () => void;
  onSearchThoughts: () => void;
  onReminisce: () => void;
};

const actions = [
  {
    number: "01",
    title: "Save a thought",
    detail: "Capture without friction",
    placement: "left-0 top-[8%]",
    icon: Save,
    iconClassName: "bg-[#eef0fa] text-[#6f7fd8]",
    action: "save",
  },
  {
    number: "02",
    title: "Ask my mind",
    detail: "Answers grounded in you",
    placement: "right-0 top-[8%]",
    icon: MessageCircleQuestion,
    iconClassName: "bg-[#e7f7f5] text-[#24796f]",
    action: "ask",
  },
  {
    number: "03",
    title: "Search thoughts",
    detail: "Find the exact fragment",
    placement: "bottom-[8%] left-0",
    icon: Search,
    iconClassName: "bg-[#eef0fa] text-[#6f7fd8]",
    action: "search",
  },
  {
    number: "04",
    title: "View thoughts",
    detail: "See emerging patterns",
    placement: "bottom-[8%] right-0",
    icon: Sparkles,
    iconClassName: "bg-[#e7f7f5] text-[#24796f]",
    action: "reminisce",
  },
] as const;

export function MindMapHome({
  showAskAction,
  onSaveThought,
  onAskMind,
  onSearchThoughts,
  onReminisce,
}: MindMapHomeProps) {
  const actionHandlers = {
    save: onSaveThought,
    ask: onAskMind,
    search: onSearchThoughts,
    reminisce: onReminisce,
  };

  return (
    <div className="mind-workspace-enter flex w-full flex-col items-center justify-center text-center">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#6f7fd8]">
          [ Private memory / 01 ]
        </p>
        <h1 className="mt-3 font-display text-[clamp(1.75rem,3vw,2.6rem)] font-medium leading-tight tracking-[-0.045em] text-[#1f2228]">
          Wander through your mind.
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#777c86]">
          Write without organizing. Return when you need clarity. Your thoughts arrange themselves quietly.
        </p>
      </div>

      <div className="relative mx-auto mt-2 aspect-square w-full max-w-[620px] sm:mt-3">
        <div className="absolute inset-[12%] rounded-full border border-black/[0.06]" />
        <div className="absolute inset-[24%] rounded-full border border-dashed border-[#6f7fd8]/25" />
        <div className="mind-sculpture absolute left-1/2 top-1/2 flex h-[116px] w-[116px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full sm:h-[250px] sm:w-[250px]">
          <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_34%_28%,#8fa0ff_0%,#5367c7_34%,#29345f_68%,#181b27_100%)] shadow-[0_35px_90px_rgba(32,42,89,0.34)]" />
          <span className="absolute inset-[13%] rounded-[43%_57%_54%_46%/46%_38%_62%_54%] border border-white/30" />
          <span className="absolute inset-[27%] rounded-[56%_44%_37%_63%/52%_60%_40%_48%] border border-white/20" />
          <span className="relative text-center text-[10px] font-semibold uppercase tracking-[0.23em] text-white/90">
            Your<br />mind
          </span>
        </div>

        {actions
          .filter((action) => action.action !== "ask" || showAskAction)
          .map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={action.number}
                className={`mind-action-card absolute ${action.placement} w-[43%] rounded-[18px] border border-black/[0.08] bg-white/80 p-3 text-left shadow-[0_18px_55px_rgba(30,34,45,0.08)] backdrop-blur-xl sm:rounded-[22px] sm:p-5`}
                style={{ animationDelay: `${index * 70}ms` }}
                type="button"
                onClick={actionHandlers[action.action]}
              >
                <span className="flex items-center justify-between text-[10px] font-semibold tracking-[0.18em] text-[#9196a0]">
                  {action.number}
                  <span aria-hidden="true">↗</span>
                </span>
                <span className="mt-2 block font-display text-xs font-semibold tracking-[-0.02em] text-[#202329] sm:mt-5 sm:text-base">
                  {action.title}
                </span>
                <span className="mt-1 hidden text-[11px] leading-5 text-[#777c86] sm:block sm:text-xs">
                  {action.detail}
                </span>
                <span className={`mt-3 inline-flex h-8 w-8 items-center justify-center rounded-xl sm:hidden ${action.iconClassName}`}>
                  <Icon size={16} aria-hidden="true" />
                </span>
              </button>
            );
          })}
      </div>
    </div>
  );
}

"use client";

import Image from "next/image";
import { BookOpen, MessageCircleQuestion, NotebookPen, Search } from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import styles from "@/app/about/page.module.css";

const views = [
  { key: "capture", label: "Save a thought", icon: NotebookPen, title: "Start with what is on your mind.", description: "A quick note or a longer reflection. Give it a title, choose a type, and decide whether AI can use it.", alt: "The thought composer, with a sample note and the AI access toggle off." },
  { key: "library", label: "Find it again", icon: Search, title: "Your thoughts, not a pile of files.", description: "Browse your library, search for a phrase, or narrow things down with tags and filters.", alt: "The library showing sample thoughts, tags, and word and meaning search controls." },
  { key: "ask", label: "Ask Omini", icon: MessageCircleQuestion, title: "Questions, with somewhere to return to.", description: "Get answers grounded in your AI-enabled thoughts, with citations you can open and read in full.", alt: "A sample AI answer with a citation and its original journal entry." },
  { key: "books", label: "Keep a passage", icon: BookOpen, title: "A bookshelf made of what stayed with you.", description: "Save a book once. Keep adding excerpts, and revisit them together from your Books view.", alt: "The Books workspace showing Circe by Madeline Miller and its saved excerpt count." },
];

export function ProductTour() {
  const [active, setActive] = useState(0);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const view = views[active];

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % views.length;
    else if (event.key === "ArrowLeft") next = (index + views.length - 1) % views.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = views.length - 1;
    else return;
    event.preventDefault();
    setActive(next);
    buttons.current[next]?.focus({ preventScroll: true });
  }

  return (
    <div className={styles.productTour}>
      <div className={styles.tourTabs} role="tablist" aria-label="Explore Mind Palace">
        {views.map(({ key, label, icon: Icon }, index) => (
          <button key={key} ref={element => { buttons.current[index] = element; }} id={`tour-tab-${key}`} role="tab" aria-selected={active === index} aria-controls={`tour-panel-${key}`} tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={event => onKeyDown(event, index)} type="button"><Icon size={18} aria-hidden="true" />{label}</button>
        ))}
      </div>
      {views.map((item, index) => (
        <div key={item.key} id={`tour-panel-${item.key}`} role="tabpanel" aria-labelledby={`tour-tab-${item.key}`} hidden={active !== index} tabIndex={0}>
          {active === index ? <>
            <div className={styles.tourCopy}><h3>{view.title}</h3><p>{view.description}</p></div>
            <figure className={styles.tourFigure}>
              <Image src={`/product/${view.key}.jpg`} alt={view.alt} width={1360} height={860} sizes="(max-width: 768px) 100vw, 1120px" unoptimized />
              <figcaption><span>Actual app. Sample content.</span><a href={`/product/${view.key}.jpg`} target="_blank" rel="noreferrer">View full image <Search size={14} aria-hidden="true" /></a></figcaption>
            </figure>
          </> : null}
        </div>
      ))}
    </div>
  );
}

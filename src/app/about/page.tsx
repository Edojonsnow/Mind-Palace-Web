import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, LockKeyhole, Plus } from "lucide-react";
import { ProductTour } from "@/components/product-tour";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Mind Palace | A home for your thoughts",
  description: "Save notes, journal entries, and book excerpts. Find them by words or meaning, and ask questions with answers linked to your own thoughts.",
};

export default function AboutPage() {
  return (
    <div className={styles.site}>
      <a className={styles.skipLink} href="#main">Skip to content</a>
      <header className={styles.navigation}>
        <Link className={styles.wordmark} href="/about" aria-label="Mind Palace home">mind palace<span aria-hidden="true">.</span></Link>
        <Link className={styles.openApp} href="/">Open Mind Palace <ArrowUpRight size={17} aria-hidden="true" /></Link>
      </header>

      <main id="main">
        <section className={styles.hero} aria-labelledby="product-name">
          <Image className={styles.heroImage} src="/product/library.jpg" alt="Mind Palace's personal library, with sample journal entries, reading notes, and thoughts." fill sizes="100vw" preload unoptimized />
          <Image className={styles.mobileHeroImage} src="/product/library-mobile.jpg" alt="The Mind Palace library on a mobile screen, showing sample thoughts." fill sizes="100vw" unoptimized />
          <div className={styles.heroCopy}>
            <div><h1 id="product-name">Mind Palace</h1><p className={styles.heroLine}>A home for your thoughts.</p></div>
            <div className={styles.heroDescription}>
              <p>The note on your way home. A line from a book. Something you are still figuring out. Keep it here, and find your way back.</p>
              <a href="#your-library" className={styles.tourLink}>Take a look inside <ArrowDown size={17} aria-hidden="true" /></a>
            </div>
          </div>
        </section>
        <p className={styles.sampleCaption}>The actual web app, shown with sample content.</p>

        <section className={styles.librarySection} id="your-library" aria-labelledby="library-heading">
          <div className={styles.sectionIntro}>
            <h2 id="library-heading">Some things are worth keeping.</h2>
            <p>Notes, journal entries, quotes, and book excerpts, together in one personal library. Write first. Add a little context when you want to.</p>
          </div>
          <ProductTour />
          <dl className={styles.organizingDetails}>
            <div><dt>Tags that mean something to you.</dt><dd>Add your own labels, then use them to find related thoughts.</dd></div>
            <div><dt>A place for every reading note.</dt><dd>Choose a saved book instead of entering its title and author again.</dd></div>
            <div><dt>Collections, on your terms.</dt><dd>Bring notes, quotes, and journal entries together without changing what they are.</dd></div>
            <div><dt>Find the words. Or the idea.</dt><dd>Search words for text matches, or choose Search by meaning for AI-assisted recall.</dd></div>
          </dl>
        </section>

        <section className={styles.askSection} id="ask" aria-labelledby="ask-heading">
          <div className={styles.sectionIntro}>
            <h2 id="ask-heading">Ask your mind.<br />Follow the thought.</h2>
            <p>Ask a question about the thoughts you have enabled for AI. Answers link back to the saved entries they draw from, so you can read the original for yourself.</p>
          </div>
          <figure className={styles.askFigure}>
            <Image src="/product/ask.jpg" alt="A sample Ask Omini conversation about making time to think, with a cited journal entry alongside the answer." width={1360} height={860} sizes="(max-width: 768px) 100vw, 1120px" unoptimized />
            <figcaption>A sample question, an answer, and the thought behind it.</figcaption>
          </figure>
        </section>

        <section className={styles.privacySection} id="privacy" aria-labelledby="privacy-heading">
          <div className={styles.privacyIntro}>
            <LockKeyhole size={24} aria-hidden="true" />
            <h2 id="privacy-heading">Your thoughts.<br />Your choice.</h2>
            <p>A personal library should be clear about what it keeps, what AI can access, and how you can leave.</p>
          </div>
          <div className={styles.privacyDetails}>
            <div><h3>You choose what AI can use.</h3><p>AI participation is off by default. Enable it for individual thoughts, or change your default in settings. Thoughts with AI off stay in your library without being sent for AI processing.</p></div>
            <div><h3>Your words stay yours to manage.</h3><p>Edit your entries, export your data, or delete a thought. Deleted thoughts can be restored during the recovery window. Account deletion is available from Privacy &amp; data.</p></div>
            <p className={styles.honestNote}>Mind Palace currently stores thoughts in the cloud. This is not end-to-end encrypted storage. AI-enabled content is processed by an external AI provider.</p>
          </div>
        </section>

        <section className={styles.questions} aria-labelledby="questions-heading">
          <h2 id="questions-heading">A few things to know.</h2>
          <div>
            <details><summary>Do I have to use AI?<Plus size={19} aria-hidden="true" /></summary><p>No. You can save, edit, browse, tag, and organize thoughts without enabling AI. Search words uses text matching. Search by meaning and Ask Omini use AI and are subject to your AI allowance.</p></details>
            <details><summary>What happens if AI processing fails?<Plus size={19} aria-hidden="true" /></summary><p>Your saved thought stays in the library. You can still read it and find it with text search. A processing status shows when organization is pending or has failed, with an option to retry.</p></details>
            <details><summary>Can I use it on my phone?<Plus size={19} aria-hidden="true" /></summary><p>The web app works in a mobile browser. Native mobile apps, offline storage, image uploads, and sharing directly from social apps are future work, not features of this version.</p></details>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div><p className={styles.footerHeading}>Keep the thought.<br />Come back to it.</p><Link className={styles.primaryAction} href="/">Open Mind Palace <ArrowUpRight size={19} aria-hidden="true" /></Link></div>
        <div className={styles.footerMeta}><span className={styles.wordmark}>mind palace<span aria-hidden="true">.</span></span><nav aria-label="Footer"><a href="#your-library">Your library</a><a href="#ask">Ask Omini</a><a href="#privacy">Privacy</a></nav><span>A personal library for what stays with you.</span></div>
      </footer>
    </div>
  );
}

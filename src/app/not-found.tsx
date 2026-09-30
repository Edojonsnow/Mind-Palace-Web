import Link from "next/link";
export default function NotFound() {
  return <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-5"><h1 className="text-display-lg">This room is not here.</h1><p className="text-muted">The page may have moved. Your thoughts are still where you left them.</p><Link href="/" className="mp-button mp-button-secondary self-start">Return to my mind</Link></main>;
}

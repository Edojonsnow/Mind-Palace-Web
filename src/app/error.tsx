"use client";
import { Button } from "@/components/ui";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-5"><h1 className="text-display-lg">A moment out of place.</h1><p className="text-muted">This view could not open. Try once more.</p><Button onClick={reset}>Try again</Button><Link className="mp-button mp-button-ghost" href="/">Return to my mind</Link></main>;
}

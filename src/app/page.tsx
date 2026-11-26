import { MindPalaceShell } from "@/components/mind-palace-shell";

export default async function Home({ searchParams }: {
  searchParams: Promise<{ account?: string }>;
}) {
  const params = await searchParams;
  return <MindPalaceShell accountDeleted={params.account === "deleted"} />;
}

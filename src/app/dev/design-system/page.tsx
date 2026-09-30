import { notFound } from "next/navigation";
import { DesignSystem } from "@/components/design-system";

export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DesignSystem />;
}

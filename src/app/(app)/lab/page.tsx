import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LabScreen } from "@/features/lab/lab-screen";
import { TEST_HOOKS } from "@/lib/flags";

export const metadata: Metadata = { title: "Lab", robots: { index: false } };

export default function LabPage() {
  if (!TEST_HOOKS) notFound();
  return <LabScreen />;
}

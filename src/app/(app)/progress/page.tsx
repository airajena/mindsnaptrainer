import type { Metadata } from "next";
import { ProgressScreen } from "@/features/progress/progress-screen";

export const metadata: Metadata = {
  title: "Progress",
  description:
    "Your capacity and speed tests, accuracy trends and personal bests. Stored on this device.",
};

export default function ProgressPage() {
  return <ProgressScreen />;
}

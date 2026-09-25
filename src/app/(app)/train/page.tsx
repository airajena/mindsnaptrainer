import type { Metadata } from "next";
import { TrainScreen } from "@/features/session/train-screen";

export const metadata: Metadata = {
  title: "Train",
  description:
    "Set up and run a visual memory session: presets, capacity and speed tests, or your own config.",
};

export default function TrainPage() {
  return <TrainScreen />;
}

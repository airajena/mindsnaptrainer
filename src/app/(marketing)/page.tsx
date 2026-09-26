import type { Metadata } from "next";
import { Hero } from "@/features/landing/hero";
import {
  Faq,
  FinalCta,
  HonestNumbers,
  HowItWorks,
  Modes,
  PrivacyBand,
  Thumb,
} from "@/features/landing/sections";
import { StickyCta } from "@/features/landing/sticky-cta";
import { SITE } from "@/lib/site";
import "@/features/landing/landing.css";

export const metadata: Metadata = {
  title: { absolute: SITE.title },
  alternates: { canonical: "/" },
};

/** Landing (PRD §11.1): a static Server Component; the demo and sticky CTA are client islands. */
export default function LandingPage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <Modes />
      <HonestNumbers />
      <Thumb />
      <PrivacyBand />
      <Faq />
      <FinalCta />
      <StickyCta />
    </>
  );
}

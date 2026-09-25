import { AppEffects } from "@/features/settings/app-effects";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AppEffects />
    </>
  );
}

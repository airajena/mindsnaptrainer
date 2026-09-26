import { AppEffects } from "@/features/setup/settings/app-effects";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AppEffects />
    </>
  );
}

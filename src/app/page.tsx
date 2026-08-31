import { Navbar } from "@/features/landing/components/Navbar";
import { HeroSection } from "@/features/landing/components/HeroSection";
import { FeaturesGrid } from "@/features/landing/components/FeaturesGrid";

export default function Page() {
  return (
    <main className="dark bg-slate-950 min-h-screen text-slate-100 selection:bg-primary selection:text-white">
      <Navbar />
      <HeroSection />
      <FeaturesGrid />
    </main>
  );
}

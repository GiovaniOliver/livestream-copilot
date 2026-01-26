import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSection } from "@/components/sections/HeroSection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { WorkflowsSection } from "@/components/sections/WorkflowsSection";
import { ObservabilitySection } from "@/components/sections/ObservabilitySection";

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <WorkflowsSection />
        <ObservabilitySection />
      </main>
      <Footer />
    </>
  );
}

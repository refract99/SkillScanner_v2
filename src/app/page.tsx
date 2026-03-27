import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Platforms } from "@/components/landing/platforms";
import { SampleReport } from "@/components/landing/sample-report";
import { ThreatCategories } from "@/components/landing/threat-categories";
import { SocialProof } from "@/components/landing/social-proof";
import { CtaSection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";

export default function HomePage() {
  return (
    <main className="flex flex-col">
      <Hero />
      <Platforms />
      <HowItWorks />
      <SampleReport />
      <ThreatCategories />
      <SocialProof />
      <CtaSection />
      <Footer />
    </main>
  );
}

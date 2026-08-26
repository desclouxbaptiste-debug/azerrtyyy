import { TwistCta } from "@/components/twist/cta";
import { TwistFeatures } from "@/components/twist/features";
import { TwistFooter } from "@/components/twist/footer";
import { TwistHero } from "@/components/twist/hero";
import { TwistNav } from "@/components/twist/nav";
import { TwistPricing } from "@/components/twist/pricing";

export default function TwistPage() {
  return (
    <>
      <TwistNav />
      <main>
        <TwistHero />
        <TwistFeatures />
        <TwistPricing />
        <TwistCta />
      </main>
      <TwistFooter />
    </>
  );
}

import { Hero, HowItWorks, LiveFeed, LiveStats, TakedownDiagram, TopCompanies } from "@/components/landing";

export default function Home() {
  return (
    <>
      <Hero />
      <LiveStats />
      <LiveFeed />
      <HowItWorks />
      <TakedownDiagram />
      <TopCompanies />
    </>
  );
}

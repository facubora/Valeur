import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import ProblemSection from "./components/ProblemSection";
import FeaturesShowcase from "./components/FeaturesShowcase";
import CandleChart from "./components/CandleChart";
// import Social from "./components/Social";
// import HowItWorks from "./components/HowItWorks";
// import CTA from "./components/CTA";
// import Footer from "./components/Footer";
import EcosystemSection from "./components/EcosystemSection" 
import CTA from "./components/CTA";



function App() {
  return (
    <>
      <Navbar />
      <Hero />
      <ProblemSection />
      <FeaturesShowcase />
      <CandleChart />
      <EcosystemSection />
      <CTA />
    </>
  );
}

export default App;
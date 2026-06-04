import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import ProblemSection from "./components/ProblemSection";
import FeaturesShowcase from "./components/FeaturesShowcase";
import CandleChart from "./components/CandleChart";
import EcosystemSection from "./components/EcosystemSection";
import CTA from "./components/CTA";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Footer from "./components/Footer"

function Landing() {
  return (
    <>
      <Navbar />
      <Hero />
      <ProblemSection />
      <FeaturesShowcase />
      <EcosystemSection />
      <CTA />
      <Footer />
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
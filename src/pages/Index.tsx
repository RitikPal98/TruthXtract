
import ThreeScene from "@/components/ThreeScene";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";

const Index = () => {
  return (
    <div className="min-h-screen relative">
      {/* 3D Background */}
      <div className="fixed top-0 left-0 w-full h-full -z-10">
        <ThreeScene />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        <Navbar />
        <HeroSection />
        <Features />
        <HowItWorks />
        <Footer />
      </div>
    </div>
  );
};

export default Index;

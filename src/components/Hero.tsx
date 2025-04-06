
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";

const Hero = () => {
  const scrollToFeatures = () => {
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
      featuresSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-28 pb-20">
      <div className="max-w-4xl mx-auto text-center relative z-10">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6 glow-text">
          <span className="block">Unveiling Truth</span>
          <span className="block">in a World of Information</span>
        </h1>
        
        <p className="mt-6 text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto">
          An AI-powered system that detects fake news with precision and transparency, 
          helping you navigate the digital information landscape safely.
        </p>
        
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <Button className="truth-button text-lg px-8 py-6">
            Start Verifying
          </Button>
          <Button 
            variant="outline" 
            className="border-truth-light text-truth-light hover:bg-truth-light/10 text-lg px-8 py-6"
          >
            Learn More
          </Button>
        </div>
        
        <div className="mt-28 animate-bounce">
          <button 
            onClick={scrollToFeatures}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Scroll down"
          >
            <ArrowDown size={32} />
          </button>
        </div>
      </div>
      
      {/* Floating stats cards */}
      <div className="absolute bottom-32 left-8 md:left-24 lg:left-32 glass-panel p-4 transform rotate-6 animate-float">
        <p className="text-truth-verified font-bold text-2xl">93%</p>
        <p className="text-gray-300">Detection Accuracy</p>
      </div>
      
      <div className="absolute top-40 right-8 md:right-24 lg:right-32 glass-panel p-4 transform -rotate-3 animate-float-slow">
        <p className="text-truth-light font-bold text-2xl">Real-time</p>
        <p className="text-gray-300">Verification</p>
      </div>
    </section>
  );
};

export default Hero;

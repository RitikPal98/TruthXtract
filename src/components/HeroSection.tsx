import { Button } from "@/components/ui/button";
import { ArrowRight, Camera } from "lucide-react";
import DeepfakeDetector3D from "@/components/DeepfakeDetector3D";
import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left Content */}
        <div className="max-w-2xl">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            <span className="block text-white">Detect</span>
            <span className="block text-white">Misinformation</span>
            <span className="block text-blue-400">in Real-Time</span>
          </h1>

          <p className="text-xl text-gray-300 mb-10 max-w-lg">
            Our AI-powered platform helps journalists and broadcasters identify
            false information as it happens, enhancing media integrity and
            public trust.
          </p>

          <div className="flex flex-wrap gap-4">
            <Button
              className="truth-button flex items-center gap-2 text-lg px-8 py-6"
              onClick={() => (window.location.href = "http://localhost:3000")}
            >
              Get Started <ArrowRight size={18} />
            </Button>

            <Link to="/deepfake-detection">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2 text-lg px-8 py-6">
                Deepfake Detection <Camera size={18} />
              </Button>
            </Link>
          </div>
        </div>

        {/* Right Content - 3D Deepfake Detector Visualization */}
        <div className="lg:block h-[500px]">
          <DeepfakeDetector3D />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

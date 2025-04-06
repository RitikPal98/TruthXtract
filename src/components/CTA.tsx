
import { Button } from "@/components/ui/button";

const CTA = () => {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="max-w-5xl mx-auto glass-panel p-8 md:p-12 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 glow-text">
          Join the Truth Revolution
        </h2>
        
        <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
          Be part of the movement to combat misinformation and promote factual integrity in the digital world.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button className="truth-button text-lg px-8 py-6">
            Get Started Now
          </Button>
          <Button 
            variant="outline" 
            className="border-truth-light text-truth-light hover:bg-truth-light/10 text-lg px-8 py-6"
          >
            Request a Demo
          </Button>
        </div>
      </div>
    </section>
  );
};

export default CTA;

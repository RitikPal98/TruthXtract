
import { AlertTriangle, BarChart2, Cpu, Database, Globe, Shield } from "lucide-react";

const FeatureCard = ({ icon, title, description }: { 
  icon: React.ReactNode, 
  title: string, 
  description: string 
}) => (
  <div className="glass-panel p-6 transition-all duration-300 hover:bg-opacity-20 hover:transform hover:-translate-y-1">
    <div className="mb-4 text-truth-light">
      {icon}
    </div>
    <h3 className="text-xl font-semibold mb-2 text-white">{title}</h3>
    <p className="text-gray-300">{description}</p>
  </div>
);

const Features = () => {
  const features = [
    {
      icon: <Cpu size={24} />,
      title: "AI-Powered Analysis",
      description: "Advanced machine learning algorithms trained on vast datasets to identify patterns of misinformation."
    },
    {
      icon: <AlertTriangle size={24} />,
      title: "Credibility Scoring",
      description: "Transparent scoring system that evaluates and rates content reliability in real-time."
    },
    {
      icon: <Globe size={24} />,
      title: "Source Verification",
      description: "Automatically cross-references information with trusted sources and fact-checking databases."
    },
    {
      icon: <BarChart2 size={24} />,
      title: "Bias Detection",
      description: "Identifies political bias and emotional manipulation techniques in news articles."
    },
    {
      icon: <Database size={24} />,
      title: "Context Analysis",
      description: "Evaluates the full context of information rather than isolated statements or quotes."
    },
    {
      icon: <Shield size={24} />,
      title: "Real-time Protection",
      description: "Browser extension that flags potentially false information as you browse the web."
    }
  ];

  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 glow-text">
            Key Features
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Our cutting-edge technology provides powerful tools to combat misinformation
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard 
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;

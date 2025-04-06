
import { ArrowRight, Database, Cpu, FileCheck, AlertTriangle, BarChart2 } from "lucide-react";

const ModelArchitectureStep = ({ number, title, description, icon }: { 
  number: number, 
  title: string, 
  description: string,
  icon: React.ReactNode
}) => (
  <div className="relative">
    <div className="glass-panel p-6 ml-12 hover:border-truth-light/50 transition-all duration-300">
      <div className="flex items-center mb-2">
        {icon}
        <h3 className="text-xl font-semibold ml-3 text-white">{title}</h3>
      </div>
      <p className="text-gray-300">{description}</p>
    </div>
    <div className="absolute left-0 top-6 w-10 h-10 bg-truth-light rounded-full flex items-center justify-center text-white font-bold animate-glow">
      {number}
    </div>
    {number < 5 && (
      <div className="absolute left-5 top-16 text-truth-light">
        <ArrowRight className="transform rotate-90 mt-4" />
      </div>
    )}
  </div>
);

const HowItWorks = () => {
  const steps = [
    {
      title: "Data Collection",
      description: "Our system continuously collects news content from various sources, including social media, news websites, and broadcasts.",
      icon: <Database className="text-truth-light" size={24} />
    },
    {
      title: "NLP Processing",
      description: "Natural Language Processing algorithms analyze text for linguistic patterns, contextual anomalies, and semantic inconsistencies.",
      icon: <Cpu className="text-truth-light" size={24} />
    },
    {
      title: "Cross-Reference Verification",
      description: "Content is cross-referenced against our verified fact database and trusted sources to identify contradictions.",
      icon: <FileCheck className="text-truth-light" size={24} />
    },
    {
      title: "Misinformation Detection",
      description: "Our proprietary ML model assesses the credibility score based on multiple factors and flags potential misinformation.",
      icon: <AlertTriangle className="text-truth-light" size={24} />
    },
    {
      title: "Detailed Analysis Report",
      description: "A comprehensive report is generated with confidence scores, evidence, and explanations for identified issues.",
      icon: <BarChart2 className="text-truth-light" size={24} />
    }
  ];

  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 relative z-10">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 glow-text">
            Model Architecture
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            How our AI determines news authenticity in real-time
          </p>
        </div>
        
        <div className="relative">
          {/* Vertical line connecting all steps */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-400/50 to-blue-600/50 h-[calc(100%-80px)]"></div>
          
          <div className="space-y-12">
            {steps.map((step, index) => (
              <ModelArchitectureStep 
                key={index}
                number={index + 1}
                title={step.title}
                description={step.description}
                icon={step.icon}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;

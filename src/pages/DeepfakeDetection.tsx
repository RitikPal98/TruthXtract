
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Upload, Camera, RefreshCw } from "lucide-react";
import { useState } from "react";

const DeepfakeDetection = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [fakeScore, setFakeScore] = useState(0);
  
  const handleUpload = () => {
    setIsAnalyzing(true);
    
    // Simulate analysis
    setTimeout(() => {
      setIsAnalyzing(false);
      setHasResult(true);
      setFakeScore(Math.random() * 100);
    }, 3000);
  };
  
  const handleReset = () => {
    setIsAnalyzing(false);
    setHasResult(false);
    setFakeScore(0);
  };
  
  return (
    <div className="min-h-screen bg-truth-dark relative">
      <div className="fixed top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-truth-dark to-truth-dark -z-10"></div>
      
      <div className="relative z-10">
        <Navbar />
        
        <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Deepfake Detection
              </h1>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Upload images or videos to detect AI-generated deepfakes using our advanced neural network analysis.
              </p>
            </div>
            
            <div className="max-w-4xl mx-auto">
              <div className="bg-truth-medium/30 backdrop-blur-md border border-white/10 rounded-xl p-8">
                {!hasResult ? (
                  <div className="flex flex-col items-center space-y-8">
                    <div className="w-full h-64 border-2 border-dashed border-gray-500 rounded-lg flex items-center justify-center">
                      {isAnalyzing ? (
                        <div className="flex flex-col items-center space-y-4">
                          <RefreshCw size={40} className="text-blue-400 animate-spin" />
                          <p className="text-gray-300">Analyzing content...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center space-y-4">
                          <Upload size={40} className="text-gray-400" />
                          <p className="text-gray-400">Drag and drop media here, or click to browse</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex space-x-4">
                      <Button 
                        className="bg-blue-600 hover:bg-blue-700 text-white" 
                        onClick={handleUpload}
                        disabled={isAnalyzing}
                      >
                        <Upload className="mr-2" size={16} /> Upload Media
                      </Button>
                      <Button 
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                        disabled={isAnalyzing}
                      >
                        <Camera className="mr-2" size={16} /> Use Camera
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-8">
                    <div className="w-full">
                      <div className="flex justify-between mb-2">
                        <span className="text-white font-medium">Deepfake Probability</span>
                        <span className={`font-medium ${fakeScore > 70 ? 'text-red-500' : fakeScore > 30 ? 'text-yellow-500' : 'text-green-500'}`}>
                          {fakeScore.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2.5">
                        <div 
                          className={`h-2.5 rounded-full ${fakeScore > 70 ? 'bg-red-500' : fakeScore > 30 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${fakeScore}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="bg-truth-dark/60 p-6 rounded-lg w-full">
                      <h3 className="text-xl font-semibold text-white mb-3">Analysis Results</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-gray-300">Face Consistency</span>
                          <span className={`font-medium ${fakeScore > 70 ? 'text-red-500' : 'text-green-500'}`}>
                            {fakeScore > 70 ? 'Inconsistent' : 'Consistent'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Blinking Pattern</span>
                          <span className={`font-medium ${fakeScore > 50 ? 'text-red-500' : 'text-green-500'}`}>
                            {fakeScore > 50 ? 'Unnatural' : 'Natural'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Lighting Consistency</span>
                          <span className={`font-medium ${fakeScore > 60 ? 'text-red-500' : 'text-green-500'}`}>
                            {fakeScore > 60 ? 'Inconsistent' : 'Consistent'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Edge Artifacts</span>
                          <span className={`font-medium ${fakeScore > 40 ? 'text-red-500' : 'text-green-500'}`}>
                            {fakeScore > 40 ? 'Detected' : 'None Detected'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 text-white" 
                      onClick={handleReset}
                    >
                      <RefreshCw className="mr-2" size={16} /> Analyze New Media
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <Footer />
      </div>
    </div>
  );
};

export default DeepfakeDetection;

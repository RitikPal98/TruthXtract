
import { Shield, ExternalLink, AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";

const FactCheckWidget = () => {
  return (
    <div className="glass-panel rounded-xl overflow-hidden border border-white/10 shadow-lg">
      <div className="bg-gradient-to-r from-blue-600/90 to-blue-400/80 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Shield size={20} />
          <h3 className="font-semibold">TruthSeeker AI Analysis</h3>
        </div>
        <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Live Demo</span>
      </div>
      
      <div className="p-6 space-y-5">
        <div className="relative">
          <div className="absolute -left-3 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-blue-600"></div>
          <div className="mb-2">
            <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">AI Detected Statement</span>
          </div>
          <p className="text-white font-medium">
            "Scientists have found that global warming is a hoax perpetuated by the scientific community."
          </p>
        </div>
        
        <div className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
              <AlertTriangle size={18} className="text-white" />
            </div>
            <div>
              <h4 className="text-white font-medium">False Claim</h4>
              <p className="text-sm text-gray-400">Confidence: 97%</p>
            </div>
          </div>
          <div className="text-sm">
            <Button variant="outline" size="sm" className="border-white/20 text-gray-200 hover:bg-white/10 hover:text-white">
              View Sources <ExternalLink className="ml-1" size={14} />
            </Button>
          </div>
        </div>
        
        <div className="bg-white/5 p-3 rounded-lg">
          <h4 className="text-sm font-medium text-gray-300 mb-2">AI Explanation</h4>
          <p className="text-sm text-gray-400">
            Multiple peer-reviewed studies from various scientific organizations confirm the 
            reality of climate change. The consensus among climate scientists is overwhelming,
            with over 97% agreeing that human-caused climate change is occurring.
          </p>
        </div>
        
        <div className="flex justify-between items-center text-xs text-gray-400 pt-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span>Analysis completed in 1.2 seconds</span>
          </div>
          <span>Broadcasted on: CNN Live</span>
        </div>
      </div>
    </div>
  );
};

export default FactCheckWidget;

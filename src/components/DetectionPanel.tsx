
import { AlertCircle } from "lucide-react";

const DetectionPanel = () => {
  return (
    <div className="glass-panel rounded-xl overflow-hidden border border-white/10 shadow-lg glow-border">
      <div className="bg-red-500/80 text-white p-4 flex items-center gap-2">
        <AlertCircle size={20} />
        <h3 className="font-semibold">Misinformation Detected</h3>
      </div>
      
      <div className="p-6 space-y-6">
        <div>
          <h4 className="text-gray-400 mb-2">Claim:</h4>
          <div className="border-l-4 border-red-500 pl-4 py-1">
            <p className="text-white">
              "Studies show that the new vaccine has been linked to severe health complications in over 30% of patients."
            </p>
          </div>
        </div>
        
        <div>
          <h4 className="text-gray-400 uppercase text-sm font-semibold mb-2">Verification</h4>
          <p className="text-white mb-2">
            Multiple peer-reviewed studies show adverse effects in less than 0.1% of patients.
          </p>
          
          <div className="text-sm text-gray-400">
            <span className="block">Sources:</span>
            <div className="flex gap-3 mt-1">
              <a href="#" className="text-blue-400 hover:underline">CDC Report</a>
              <a href="#" className="text-blue-400 hover:underline">NEJM Study</a>
            </div>
          </div>
        </div>
        
        <div className="border-t border-white/10 pt-3 flex justify-between items-center">
          <div className="text-sm text-gray-400">
            <span>Detected 1m 23s ago • Broadcast: News Channel 5</span>
          </div>
          <div className="text-red-500 font-bold">
            False (95%)
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetectionPanel;


import React from 'react';

const TrustedBy = () => {
  return (
    <section className="py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="flex">
            <div className="w-10 h-10 rounded-full bg-gray-200/20"></div>
            <div className="w-10 h-10 rounded-full bg-gray-300/20 -ml-3"></div>
            <div className="w-10 h-10 rounded-full bg-gray-400/20 -ml-3"></div>
            <div className="w-10 h-10 rounded-full bg-gray-500/20 -ml-3 flex items-center justify-center text-xs text-gray-300">+8</div>
          </div>
          <span className="text-gray-400">Trusted by broadcasters worldwide</span>
        </div>
      </div>
    </section>
  );
};

export default TrustedBy;

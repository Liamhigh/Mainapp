
import React from 'react';

interface ChatAssistantProps {
  onProceed: () => void;
}

export const ChatAssistant: React.FC<ChatAssistantProps> = ({ onProceed }) => {
  return (
    <div className="max-w-3xl mx-auto text-center animate-fade-in">
      <h2 className="text-3xl font-bold text-gray-100 mb-4">Welcome to Verum Omnis</h2>
      <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
        I am an autonomous legal-verification engine. My purpose is to serve as an advanced forensic AI analyst. Provide any document, and I will perform a deep forensic analysis based on legal, behavioral, and financial intelligence to identify patterns of criminal or dishonest behavior.
      </p>
      <button
        onClick={onProceed}
        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500"
      >
        Initiate Analysis
      </button>
      <div className="mt-8 text-sm text-gray-500 space-y-2">
          <p><span className="font-semibold text-gray-400">Objective & Evidence-Based:</span> All findings are derived directly from the provided evidence, ensuring an unbiased and factual report.</p>
          <p><span className="font-semibold text-gray-400">Secure & Private:</span> Your documents are processed entirely on-device. No data is ever uploaded or stored on external servers.</p>
      </div>
    </div>
  );
};

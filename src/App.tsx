import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { AnalysisDisplay } from './components/AnalysisDisplay';
import { Loader } from './components/Loader';
import { Header } from './components/Header';
import { analyzeDocument } from './services/geminiService';
import type { AnalysisResult } from './types';
import { ChatAssistant } from './components/ChatAssistant';
import ReportWorker from './workers/report.worker.ts?worker';

const getCurrentLocation = (): Promise<{ latitude: number; longitude: number } | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by this browser.");
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.warn(`Geolocation error: ${error.message}`);
        resolve(null);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 600000, 
      }
    );
  });
};

type View = 'chat' | 'upload' | 'loading' | 'analysis';

const App: React.FC = () => {
  const [view, setView] = useState<View>('chat');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [loaderMessage, setLoaderMessage] = useState<string | null>(null);
  
  const handleReset = useCallback(() => {
    setView('chat');
    setAnalysisResult(null);
    setCurrentFile(null);
    setError(null);
    setIsLoading(false);
  }, []);

  const processVerumBin = useCallback((file: File) => {
    setIsLoading(true);
    setView('loading');
    setError(null);
    setAnalysisResult(null);
    setCurrentFile(file);
    setLoaderMessage('Decoding Verum Omnis binary report...');

    const worker = new ReportWorker();

    worker.onmessage = (event: MessageEvent) => {
      const { type, result, message } = event.data;
      if (type === 'success') {
        setAnalysisResult(result);
        setCurrentFile(new File([], result.fileName, { type: 'application/octet-stream' }));
        setView('analysis');
        setIsLoading(false);
      } else if (type === 'progress') {
        setLoaderMessage(message);
      } else if (type === 'error') {
        setError(`Worker error: ${message}`);
        setIsLoading(false);
        setView('upload');
      }
      if (type === 'success' || type === 'error') {
        worker.terminate();
      }
    };

    worker.onerror = (e) => {
      setError(`Failed to process report: ${e.message}`);
      setIsLoading(false);
      setView('upload');
      worker.terminate();
    };

    worker.postMessage(file);
  }, [handleReset]);

  const handleFileAnalysis = useCallback(async (file: File) => {
    setIsLoading(true);
    setView('loading');
    setError(null);
    setAnalysisResult(null);
    setCurrentFile(file);
    setLoaderMessage('Acquiring jurisdictional context...');

    try {
      const location = await getCurrentLocation();
      const language = navigator.language || 'en-US';
      
      setLoaderMessage(null);

      const reader = new FileReader();
      reader.onload = async (event) => {
        if (!event.target?.result) {
          setError('Failed to read file.');
          setIsLoading(false);
          setView('upload');
          return;
        }
        
        const dataUrl = event.target.result as string;
        const fileContent = dataUrl.split(',')[1];
        const fileType = file.type;

        try {
          const result = await analyzeDocument(fileContent, fileType, file.name, location, language);
          setAnalysisResult(result);
          setView('analysis');
        } catch (e: any) {
          console.error(e);
          setError(`Analysis failed: ${e.message}`);
          setView('upload');
        } finally {
          setIsLoading(false);
        }
      };
      
      reader.onerror = () => {
        setError('Error reading file.');
        setIsLoading(false);
        setView('upload');
      };

      reader.readAsDataURL(file);

    } catch (e: any) {
        console.error("Error during analysis setup:", e);
        setError(`An error occurred before file analysis: ${e.message}`);
        setIsLoading(false);
        setView('upload');
    }
  }, [handleReset]);
  
  const handleFileUpload = useCallback((file: File) => {
    if (file.name.toLowerCase().endsWith('.verum.bin')) {
        processVerumBin(file);
    } else {
        handleFileAnalysis(file);
    }
  }, [processVerumBin, handleFileAnalysis]);


  return (
    <div className="bg-gray-900 text-white min-h-screen p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <Header onReset={handleReset} />
        <main className="mt-12">
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg mb-6 animate-fade-in">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-300">An Error Occurred</h3>
                  <div className="mt-2 text-sm text-red-400">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'chat' && <ChatAssistant onProceed={() => setView('upload')} />}
          {view === 'upload' && <FileUpload onFileUpload={handleFileUpload} />}
          {view === 'loading' && currentFile && <Loader fileName={currentFile.name} message={loaderMessage} />}
          {view === 'analysis' && analysisResult && currentFile && (
            <AnalysisDisplay result={analysisResult} fileName={currentFile.name} onReset={handleReset} />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;

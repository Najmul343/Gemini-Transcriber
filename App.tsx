import React, { useState } from 'react';
import AudioInput from './components/AudioInput.tsx';
import TranscriptView from './components/TranscriptView.tsx';
import { transcribeAudio } from './services/geminiService.ts';
import { AudioState, AppStatus } from './types.ts';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [audioData, setAudioData] = useState<AudioState | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAudioReady = (audio: AudioState) => {
    setAudioData(audio);
    setTranscript('');
    setErrorMsg(null);
    setStatus(AppStatus.IDLE);
  };

  const handleTranscribe = async () => {
    if (!audioData?.base64 || !audioData?.mimeType) return;

    setStatus(AppStatus.PROCESSING);
    setErrorMsg(null);

    try {
      const text = await transcribeAudio(audioData.base64, audioData.mimeType);
      setTranscript(text);
      setStatus(AppStatus.COMPLETED);
    } catch (error: any) {
      setStatus(AppStatus.ERROR);
      setErrorMsg(error.message || "Failed to transcribe audio. Please try again.");
    }
  };

  const handleReset = () => {
    setAudioData(null);
    setTranscript('');
    setStatus(AppStatus.IDLE);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 font-sans text-slate-800 pb-20">
      {/* Hero Header */}
      <header className="pt-16 pb-12 px-6 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-emerald-100 mb-6">
            <span className="bg-emerald-100 text-emerald-700 p-2 rounded-xl mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="23"/><line x1="8" x2="16" y1="23" y2="23"/></svg>
            </span>
            <span className="font-bold text-xl tracking-tight text-slate-800">UrduScribe AI</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
          Audio to <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-green-500">Urdu Text</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto">
          Upload an MP3 or record your voice. Our AI will listen and generate an accurate Urdu transcript in seconds.
        </p>
      </header>

      <main className="container mx-auto px-4">
        {/* Input Section */}
        {!audioData && (
            <AudioInput 
                onAudioReady={handleAudioReady} 
                disabled={status === AppStatus.PROCESSING} 
            />
        )}

        {/* Selected Audio Preview & Actions */}
        {audioData && (
            <div className="w-full max-w-2xl mx-auto animate-fade-in">
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-emerald-100 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex-shrink-0 flex items-center justify-center text-emerald-600">
                           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                        </div>
                        <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{audioData.name || 'Recorded Audio'}</p>
                            <p className="text-xs text-gray-500 uppercase">{audioData.mimeType.split('/')[1]}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                        {status === AppStatus.IDLE && (
                            <button 
                                onClick={handleReset}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                title="Remove file"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                            </button>
                        )}
                        
                        {status === AppStatus.IDLE ? (
                             <button 
                                onClick={handleTranscribe}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-full font-semibold shadow-md shadow-emerald-200 transition-all flex items-center gap-2"
                             >
                                <span>Transcribe</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                             </button>
                        ) : status === AppStatus.PROCESSING ? (
                             <div className="flex items-center gap-2 px-6 py-2.5 bg-gray-100 rounded-full text-gray-500 font-medium cursor-wait">
                                <div className="w-4 h-4 border-2 border-gray-300 border-t-emerald-600 rounded-full animate-spin"></div>
                                Processing...
                             </div>
                        ) : (
                             <button 
                                onClick={handleReset}
                                className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-6 py-2.5 rounded-full font-semibold transition-all"
                             >
                                Start Over
                             </button>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Error Message */}
        {errorMsg && (
            <div className="w-full max-w-2xl mx-auto mt-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 animate-fade-in">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                {errorMsg}
            </div>
        )}

        {/* Results */}
        {status === AppStatus.COMPLETED && transcript && (
            <TranscriptView transcript={transcript} />
        )}
      </main>
    </div>
  );
};

export default App;
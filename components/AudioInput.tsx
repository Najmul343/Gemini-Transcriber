import React, { useState, useRef, useEffect } from 'react';
import { AudioState } from '../types.ts';

interface AudioInputProps {
  onAudioReady: (audio: AudioState) => void;
  disabled: boolean;
}

const AudioInput: React.FC<AudioInputProps> = ({ onAudioReady, disabled }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'record' | 'youtube'>('upload');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isFetchingYT, setIsFetchingYT] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic validation
    if (!file.type.startsWith('audio/')) {
      alert("Please upload a valid audio file.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      onAudioReady({
        file: file,
        base64: base64String,
        mimeType: file.type,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          onAudioReady({
            file: null, // Virtual file
            base64: base64String,
            mimeType: 'audio/webm',
            name: `Recording_${new Date().toLocaleTimeString()}.webm`
          });
        };
        reader.readAsDataURL(blob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please ensure permissions are granted.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getYoutubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleYoutubeFetch = async () => {
    const videoId = getYoutubeVideoId(youtubeUrl);
    if (!videoId) {
      alert("Invalid YouTube URL");
      return;
    }

    setIsFetchingYT(true);

    // List of Invidious instances
    const instances = [
      'https://inv.nadeko.net',
      'https://invidious.jing.rocks',
      'https://vid.uff.oulu.fi',
      'https://invidious.nerdvpn.de'
    ];

    let blob: Blob | null = null;
    let error: any = null;

    // Try instances sequentially
    for (const instance of instances) {
      try {
        console.log(`Trying ${instance}...`);
        // itag 140 is M4A audio. local=true forces proxying.
        const targetUrl = `${instance}/latest_version?id=${videoId}&itag=140&local=true`;
        
        // Try Direct first
        try {
            const response = await fetch(targetUrl, { method: 'GET' });
            if (response.ok) {
                blob = await response.blob();
                break;
            }
        } catch(directError) {
            // Direct failed, try via CORS Proxy
            console.log(`Direct fetch failed for ${instance}, trying CORS proxy...`);
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
            const response = await fetch(proxyUrl);
            if (response.ok) {
                blob = await response.blob();
                break; 
            }
        }
      } catch (e) {
        console.warn(`Failed to fetch from ${instance}:`, e);
        error = e;
      }
    }

    if (blob && blob.size > 0) {
       // Check size limit (roughly 20MB)
       if (blob.size > 20 * 1024 * 1024) {
         setIsFetchingYT(false);
         alert("Video audio is too large (>20MB). Please use a shorter video.");
         return;
       }

       const reader = new FileReader();
       reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          onAudioReady({
            file: null,
            base64: base64String,
            mimeType: 'audio/mp4', // M4A container
            name: `YouTube_${videoId}.m4a`
          });
          setIsFetchingYT(false);
       };
       reader.readAsDataURL(blob);
    } else {
      setIsFetchingYT(false);
      alert("Could not fetch audio. Please try another video or download it manually.");
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-lg border border-emerald-100 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setActiveTab('upload')}
          disabled={disabled || isRecording || isFetchingYT}
          className={`flex-1 py-4 text-sm font-semibold transition-colors ${
            activeTab === 'upload' 
              ? 'text-emerald-600 bg-emerald-50' 
              : 'text-gray-500 hover:text-emerald-500 hover:bg-gray-50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            Upload
          </span>
        </button>
        <button
          onClick={() => setActiveTab('record')}
          disabled={disabled || isFetchingYT}
          className={`flex-1 py-4 text-sm font-semibold transition-colors ${
            activeTab === 'record' 
              ? 'text-emerald-600 bg-emerald-50' 
              : 'text-gray-500 hover:text-emerald-500 hover:bg-gray-50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="23"/><line x1="8" x2="16" y1="23" y2="23"/></svg>
            Record
          </span>
        </button>
        <button
          onClick={() => setActiveTab('youtube')}
          disabled={disabled || isRecording}
          className={`flex-1 py-4 text-sm font-semibold transition-colors ${
            activeTab === 'youtube' 
              ? 'text-emerald-600 bg-emerald-50' 
              : 'text-gray-500 hover:text-emerald-500 hover:bg-gray-50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor"/></svg>
            YouTube
          </span>
        </button>
      </div>

      <div className="p-8">
        {activeTab === 'upload' && (
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-emerald-200 rounded-xl p-8 transition-colors hover:border-emerald-400 bg-gray-50/50">
             <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 text-emerald-600">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="M9 15l3-3 3 3"/></svg>
             </div>
             <p className="text-gray-600 mb-2 font-medium">Click to select an MP3, WAV or M4A file</p>
             <p className="text-gray-400 text-xs mb-6">Max size: 20MB</p>
             <input 
               type="file" 
               accept="audio/*" 
               onChange={handleFileUpload} 
               disabled={disabled}
               className="block w-full text-sm text-gray-500
                 file:mr-4 file:py-2 file:px-4
                 file:rounded-full file:border-0
                 file:text-sm file:font-semibold
                 file:bg-emerald-600 file:text-white
                 hover:file:bg-emerald-700
                 cursor-pointer"
             />
          </div>
        )}

        {activeTab === 'record' && (
          <div className="flex flex-col items-center justify-center py-6">
             <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 transition-all duration-500 ${isRecording ? 'bg-red-50 ring-4 ring-red-100' : 'bg-emerald-50'}`}>
                {isRecording ? (
                   <div className="animate-pulse w-full h-full rounded-full bg-red-100 flex items-center justify-center">
                      <span className="text-3xl font-mono font-bold text-red-500">{formatTime(recordingTime)}</span>
                   </div>
                ) : (
                   <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="23"/><line x1="8" x2="16" y1="23" y2="23"/></svg>
                )}
             </div>

             {isRecording ? (
               <button
                 onClick={stopRecording}
                 className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold shadow-lg shadow-red-200 transition-all transform active:scale-95 flex items-center gap-2"
               >
                 <div className="w-3 h-3 bg-white rounded-sm"></div>
                 Stop Recording
               </button>
             ) : (
               <button
                 onClick={startRecording}
                 disabled={disabled}
                 className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-semibold shadow-lg shadow-emerald-200 transition-all transform active:scale-95 flex items-center gap-2"
               >
                 <div className="w-3 h-3 bg-red-400 rounded-full animate-pulse"></div>
                 Start Recording
               </button>
             )}
          </div>
        )}

        {activeTab === 'youtube' && (
          <div className="flex flex-col items-center justify-center py-4">
             <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-600">
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor"/></svg>
             </div>
             
             <div className="w-full max-w-md">
                <p className="text-gray-600 mb-2 font-medium text-center">Enter YouTube Video URL</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="https://www.youtube.com/watch?v=..." 
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    disabled={isFetchingYT || disabled}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all disabled:opacity-50"
                  />
                  <button 
                    onClick={handleYoutubeFetch}
                    disabled={isFetchingYT || disabled || !youtubeUrl}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
                  >
                    {isFetchingYT ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      'Fetch'
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">Note: This uses Invidious instances to fetch audio. Availability may vary.</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioInput;
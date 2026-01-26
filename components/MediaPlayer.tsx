
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Plus, Trash2, List, Minimize2, Youtube, ExternalLink, AlertCircle } from 'lucide-react';

interface MediaItem {
  id: string;
  url: string;
  title: string;
  videoId: string;
}

interface MediaPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  onPlayingChange: (isPlaying: boolean) => void;
}

export const MediaPlayer: React.FC<MediaPlayerProps> = ({ isOpen, onClose, onPlayingChange }) => {
  const [playlist, setPlaylist] = useState<MediaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  
  // Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Input State
  const [inputUrl, setInputUrl] = useState('');
  const [inputTitle, setInputTitle] = useState('');
  const [showPlaylist, setShowPlaylist] = useState(true); // Default to true for better UX in larger height
  const [errorMsg, setErrorMsg] = useState('');

  // Extract YouTube ID (Robust Regex)
  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleAddVideo = () => {
    setErrorMsg('');
    if (!inputUrl.trim()) return;
    
    const videoId = getYouTubeId(inputUrl);
    if (!videoId) {
      setErrorMsg("Link tidak valid. Gunakan link YouTube standar.");
      return;
    }

    const newItem: MediaItem = {
      id: Date.now().toString(),
      url: inputUrl,
      title: inputTitle || `Track ${playlist.length + 1}`,
      videoId: videoId
    };

    const newPlaylist = [...playlist, newItem];
    setPlaylist(newPlaylist);
    setInputUrl('');
    setInputTitle('');
    
    // Auto play if it's the first item
    if (newPlaylist.length === 1) {
      setCurrentIndex(0);
      setIsPlaying(true);
    }
  };

  const handleDeleteItem = (index: number) => {
    const newPlaylist = [...playlist];
    newPlaylist.splice(index, 1);
    setPlaylist(newPlaylist);
    
    if (index === currentIndex) {
        if (newPlaylist.length === 0) {
            setIsPlaying(false);
        } else {
            setCurrentIndex(index >= newPlaylist.length ? 0 : index);
        }
    } else if (index < currentIndex) {
        setCurrentIndex(prev => prev - 1);
    }
  };

  const handleClearPlaylist = () => {
    if (confirm("Hapus semua playlist?")) {
      setPlaylist([]);
      setCurrentIndex(0);
      setIsPlaying(false);
    }
  };

  const handleNext = () => {
    if (playlist.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % playlist.length);
    setIsPlaying(true);
  };

  const handlePrev = () => {
    if (playlist.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
    setIsPlaying(true);
  };

  const sendCommand = (command: string) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: command, args: [] }), 
        '*'
      );
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      sendCommand('pauseVideo');
      setIsPlaying(false);
    } else {
      sendCommand('playVideo');
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    if (playlist.length > 0) {
      setIsPlaying(true);
    }
  }, [currentIndex, playlist.length]);

  useEffect(() => {
    onPlayingChange(isPlaying);
  }, [isPlaying, onPlayingChange]);

  // Widget Classes: Increased Height to 750px
  const widgetClasses = `fixed bottom-20 right-4 md:bottom-24 md:right-8 bg-slate-900 text-white rounded-xl shadow-2xl z-[100] transition-all duration-300 border border-slate-700 overflow-hidden flex flex-col w-80 md:w-96 h-[750px] ${isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-10 pointer-events-none'}`;

  const currentVideo = playlist[currentIndex];
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className={widgetClasses}>
      {/* Header */}
      <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center cursor-move">
         <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
               <Youtube size={18} className="text-white" />
            </div>
            <div className="flex flex-col">
               <span className="text-xs font-bold uppercase tracking-widest leading-none">Media Center</span>
               <span className="text-[10px] text-slate-400 mt-1">Playlist Manager</span>
            </div>
         </div>
         <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
            <Minimize2 size={18}/>
         </button>
      </div>

      {/* Video Area */}
      <div className="relative w-full pt-[56.25%] bg-black">
        {currentVideo ? (
          <iframe
            ref={iframeRef}
            key={currentVideo.id} 
            className="absolute top-0 left-0 w-full h-full"
            src={`https://www.youtube.com/embed/${currentVideo.videoId}?autoplay=1&enablejsapi=1&controls=1&rel=0&playsinline=1&origin=${origin}`}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          ></iframe>
        ) : (
          <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-950">
             <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-800">
                <Youtube size={32} className="opacity-40 text-red-600"/>
             </div>
             <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">No Media Active</span>
             <span className="text-[10px] text-slate-600 mt-2">Paste YouTube URL to start</span>
          </div>
        )}
      </div>

      {/* Info & Basic Controls */}
      <div className="p-5 bg-slate-900 border-b border-slate-800">
         {currentVideo ? (
             <div className="mb-4">
               <h4 className="font-bold text-sm truncate text-white" title={currentVideo.title}>{currentVideo.title}</h4>
               <div className="flex justify-between items-center mt-1">
                  <span className="text-[10px] text-red-500 font-bold uppercase">Now Playing</span>
                  <a href={currentVideo.url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 hover:underline flex items-center gap-1">
                    YouTube <ExternalLink size={10}/>
                  </a>
               </div>
             </div>
         ) : <div className="mb-4 h-10"></div>}
         
         <div className="flex justify-center items-center gap-8">
            <button onClick={handlePrev} disabled={playlist.length === 0} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all disabled:opacity-20"><SkipBack size={20}/></button>
            <button 
                onClick={togglePlay} 
                disabled={playlist.length === 0}
                className={`w-14 h-14 flex items-center justify-center rounded-full shadow-2xl transition-all ${
                    playlist.length === 0 ? 'bg-slate-800 text-slate-700 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white hover:scale-110 active:scale-95'
                }`}
            >
                {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1"/>}
            </button>
            <button onClick={handleNext} disabled={playlist.length === 0} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all disabled:opacity-20"><SkipForward size={20}/></button>
         </div>
      </div>

      {/* Add New Media Section */}
      <div className="p-5 bg-slate-900/80 border-b border-slate-800">
         <div className="flex justify-between items-center mb-3">
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Quick Add</span>
             {errorMsg && <span className="text-[10px] text-red-400 flex items-center gap-1 animate-pulse"><AlertCircle size={10}/> Error</span>}
         </div>
         <div className="flex gap-2">
            <input 
              className="flex-1 bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2 focus:ring-1 focus:ring-red-500 outline-none placeholder-slate-600"
              placeholder="YouTube URL..."
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
            />
            <button onClick={handleAddVideo} className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg shadow-lg transition-all active:scale-95">
              <Plus size={20} />
            </button>
         </div>
         {errorMsg && <p className="text-[9px] text-red-400 mt-1 italic">{errorMsg}</p>}
      </div>

      {/* Playlist Section - Increased visibility in high container */}
      <div className="flex-1 overflow-hidden flex flex-col bg-slate-950">
         <div className="px-5 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-900/30">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
               <List size={12}/> Queue ({playlist.length})
            </span>
            {playlist.length > 0 && (
              <button onClick={handleClearPlaylist} className="text-[10px] text-slate-500 hover:text-red-400 transition-colors uppercase font-bold">Clear All</button>
            )}
         </div>
         <div className="flex-1 overflow-y-auto custom-scrollbar">
            {playlist.map((item, idx) => (
               <div key={item.id} className={`flex justify-between items-center px-5 py-3 group transition-colors border-b border-slate-800/50 ${idx === currentIndex ? 'bg-red-600/10' : 'hover:bg-slate-900/50'}`}>
                  <button 
                    onClick={() => setCurrentIndex(idx)} 
                    className="flex-1 text-left truncate flex items-center gap-3"
                  >
                     <span className={`text-[10px] w-4 ${idx === currentIndex ? 'text-red-500 font-bold' : 'text-slate-600'}`}>{idx + 1}</span>
                     <span className={`text-xs truncate ${idx === currentIndex ? 'text-red-400 font-bold' : 'text-slate-300'}`}>{item.title}</span>
                  </button>
                  <button onClick={() => handleDeleteItem(idx)} className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-600 hover:text-red-500 transition-all">
                     <Trash2 size={14} />
                  </button>
               </div>
            ))}
            {playlist.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-700">
                    <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mb-3">
                       <List size={24} className="opacity-20"/>
                    </div>
                    <p className="text-xs font-medium uppercase tracking-tight">Your playlist is empty</p>
                    <p className="text-[10px] mt-1">Add tracks to build your listening experience</p>
                </div>
            )}
         </div>
      </div>
    </div>
  );
};

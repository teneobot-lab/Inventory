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
  const [showPlaylist, setShowPlaylist] = useState(false);
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
    } else {
        // If not first, just switch to list view to show it was added
        setShowPlaylist(true);
    }
  };

  const handleDeleteItem = (index: number) => {
    const newPlaylist = [...playlist];
    newPlaylist.splice(index, 1);
    setPlaylist(newPlaylist);
    
    if (index === currentIndex) {
        // If we deleted the current song
        if (newPlaylist.length === 0) {
            setIsPlaying(false);
        } else {
            // Move to next available or 0
            setCurrentIndex(index >= newPlaylist.length ? 0 : index);
        }
    } else if (index < currentIndex) {
        // Shift index down if we deleted something before current
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

  // --- YOUTUBE CONTROL LOGIC ---
  
  // Send command to YouTube Iframe
  const sendCommand = (command: string) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      // Use '*' as targetOrigin to ensure message reaches YouTube regardless of specific subdomain redirections
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

  // Reset play state when video changes
  useEffect(() => {
    if (playlist.length > 0) {
      setIsPlaying(true);
    }
  }, [currentIndex, playlist.length]); // Depend on playlist length too in case of first add

  // Sync playing state with parent
  useEffect(() => {
    onPlayingChange(isPlaying);
  }, [isPlaying, onPlayingChange]);

  // Widget Classes: Use opacity/pointer-events to hide but keep audio playing
  const widgetClasses = `fixed bottom-20 right-4 md:bottom-24 md:right-8 bg-slate-900 text-white rounded-xl shadow-2xl z-[100] transition-all duration-300 border border-slate-700 overflow-hidden flex flex-col w-80 md:w-96 h-[500px] ${isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-10 pointer-events-none'}`;

  const currentVideo = playlist[currentIndex];
  
  // Origin handling for security
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className={widgetClasses}>
      {/* Header */}
      <div className="p-3 bg-slate-800 border-b border-slate-700 flex justify-between items-center cursor-move">
         <div className="flex items-center gap-2">
            <Youtube size={18} className="text-red-500" />
            <span className="text-xs font-bold uppercase tracking-wider">Media Player</span>
         </div>
         <div className="flex items-center gap-1">
            <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white" title="Minimize">
                <Minimize2 size={16}/>
            </button>
         </div>
      </div>

      {/* Video Area */}
      <div className="relative w-full pt-[56.25%] bg-black group">
        {currentVideo ? (
          <iframe
            ref={iframeRef}
            // KEY IS IMPORTANT: Forces React to re-mount iframe when video changes
            key={currentVideo.id} 
            className="absolute top-0 left-0 w-full h-full"
            // Params:
            // autoplay=1: Try to autoplay
            // enablejsapi=1: Allow postMessage control
            // controls=1: Show native controls (backup if custom buttons fail)
            // rel=0: Don't show related videos from others
            // playsinline=1: Play inline on mobile
            // origin: Security
            src={`https://www.youtube.com/embed/${currentVideo.videoId}?autoplay=1&enablejsapi=1&controls=1&rel=0&playsinline=1&origin=${origin}&widget_referrer=${origin}`}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            onLoad={() => {
                // Attempt to sync state once loaded. 
                // Note: Modern browsers might block this autoplay if user hasn't interacted with document.
                if (isPlaying) sendCommand('playVideo');
            }}
          ></iframe>
        ) : (
          <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-950">
             <Youtube size={48} className="mb-2 opacity-20 text-red-500"/>
             <span className="text-xs font-medium">Playlist Kosong</span>
             <span className="text-[10px] text-slate-600 mt-1">Tambahkan link YouTube di bawah</span>
          </div>
        )}
      </div>

      {/* Controls & Info */}
      <div className="p-4 bg-slate-900 flex flex-col gap-2 relative z-10">
         {currentVideo ? (
             <div className="mb-2">
               <h4 className="font-semibold text-sm truncate pr-4" title={currentVideo.title}>{currentVideo.title}</h4>
               <p className="text-[10px] text-slate-400 flex justify-between">
                  <span>Track {currentIndex + 1} / {playlist.length}</span>
                  <a href={currentVideo.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                    Buka <ExternalLink size={8}/>
                  </a>
               </p>
             </div>
         ) : (
             <div className="mb-2 h-10 flex items-center justify-center text-xs text-slate-600 italic">
                - Tidak ada media yang diputar -
             </div>
         )}
         
         <div className="flex justify-center items-center gap-6 mb-2">
            <button onClick={handlePrev} disabled={playlist.length === 0} className="p-2 hover:bg-slate-800 rounded-full text-slate-300 hover:text-white disabled:opacity-30"><SkipBack size={24}/></button>
            
            <button 
                onClick={togglePlay} 
                disabled={playlist.length === 0}
                className={`w-14 h-14 flex items-center justify-center rounded-full shadow-lg transition-all ${
                    playlist.length === 0 ? 'bg-slate-800 text-slate-600' : 'bg-red-600 hover:bg-red-700 text-white hover:scale-105 active:scale-95'
                }`}
            >
                {isPlaying ? (
                    <Pause size={24} fill="currentColor" />
                ) : (
                    <Play size={24} fill="currentColor" className="ml-1"/>
                )}
            </button>
            
            <button onClick={handleNext} disabled={playlist.length === 0} className="p-2 hover:bg-slate-800 rounded-full text-slate-300 hover:text-white disabled:opacity-30"><SkipForward size={24}/></button>
         </div>

         <div className="flex justify-between items-center border-t border-slate-800 pt-3">
             <button onClick={() => setShowPlaylist(!showPlaylist)} className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${showPlaylist ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/50'}`}>
               <List size={14} /> {showPlaylist ? 'Sembunyikan Playlist' : 'Lihat Playlist'}
             </button>
             <span className="text-[10px] text-slate-500">{playlist.length} Items</span>
         </div>
      </div>

      {/* Playlist & Add Section */}
      <div className="flex-1 overflow-hidden flex flex-col bg-slate-800/50 relative">
         {showPlaylist ? (
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {playlist.map((item, idx) => (
                   <div key={item.id} className={`flex justify-between items-center p-2 rounded text-xs group transition-colors ${idx === currentIndex ? 'bg-red-900/20 border border-red-900/50' : 'hover:bg-slate-800'}`}>
                      <button 
                        onClick={() => {
                            setCurrentIndex(idx);
                            setIsPlaying(true);
                        }} 
                        className="flex-1 text-left truncate flex items-center gap-2"
                      >
                         {idx === currentIndex ? (
                             <div className="w-4 flex justify-center"><div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div></div>
                         ) : (
                             <div className="w-4 text-slate-500 text-[10px]">{idx + 1}</div>
                         )}
                         <span className={idx === currentIndex ? 'text-red-400 font-medium' : 'text-slate-300 group-hover:text-white'}>{item.title}</span>
                      </button>
                      <button onClick={() => handleDeleteItem(idx)} className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded transition-all">
                         <Trash2 size={12} />
                      </button>
                   </div>
                ))}
                {playlist.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-32 text-slate-500">
                        <List size={24} className="mb-2 opacity-20"/>
                        <p className="text-xs">Playlist masih kosong.</p>
                    </div>
                )}
                
                <div className="sticky bottom-0 bg-slate-800/90 backdrop-blur p-2 border-t border-slate-700 flex justify-center">
                    <button onClick={() => setShowPlaylist(false)} className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                        <Plus size={12}/> Tambah Lagu Baru
                    </button>
                </div>
            </div>
         ) : (
            <div className="flex-1 p-4 flex flex-col gap-3">
               <div className="flex justify-between items-center">
                   <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tambah Media</div>
                   {playlist.length > 0 && (
                       <button onClick={handleClearPlaylist} className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1">
                         <Trash2 size={10}/> Clear
                       </button>
                   )}
               </div>
               
               {errorMsg && (
                   <div className="bg-red-900/20 border border-red-900/50 p-2 rounded text-[10px] text-red-300 flex items-center gap-2">
                       <AlertCircle size={12}/> {errorMsg}
                   </div>
               )}

               <div className="space-y-2">
                   <input 
                     className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded p-3 focus:ring-1 focus:ring-red-500 outline-none placeholder-slate-600 transition-colors"
                     placeholder="Paste Link YouTube (https://youtu.be/...)"
                     value={inputUrl}
                     onChange={e => setInputUrl(e.target.value)}
                   />
                   <input 
                     className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded p-3 focus:ring-1 focus:ring-red-500 outline-none placeholder-slate-600 transition-colors"
                     placeholder="Judul Lagu (Opsional)"
                     value={inputTitle}
                     onChange={e => setInputTitle(e.target.value)}
                   />
               </div>

               <button onClick={handleAddVideo} className="bg-red-600 hover:bg-red-700 text-white text-xs py-2.5 rounded font-bold uppercase tracking-wide flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95">
                 <Plus size={14} /> Tambah ke Playlist
               </button>
               
               <div className="mt-auto text-[10px] text-slate-600 text-center px-4 leading-relaxed">
                  Tips: Pastikan link YouTube bersifat publik atau tidak terdaftar (unlisted). Video privat tidak dapat diputar.
               </div>
            </div>
         )}
      </div>
    </div>
  );
};
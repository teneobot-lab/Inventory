import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Plus, Trash2, List, Minimize2, Maximize2, X, Music, Youtube } from 'lucide-react';

interface MediaItem {
  id: string;
  url: string;
  title: string;
  videoId: string;
}

export const MediaPlayer: React.FC = () => {
  const [isMinimized, setIsMinimized] = useState(true);
  const [playlist, setPlaylist] = useState<MediaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  
  // Input State
  const [inputUrl, setInputUrl] = useState('');
  const [inputTitle, setInputTitle] = useState('');
  const [showPlaylist, setShowPlaylist] = useState(false);

  // Extract YouTube ID
  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleAddVideo = () => {
    if (!inputUrl) return;
    
    const videoId = getYouTubeId(inputUrl);
    if (!videoId) {
      alert("Link YouTube tidak valid!");
      return;
    }

    const newItem: MediaItem = {
      id: Date.now().toString(),
      url: inputUrl,
      title: inputTitle || `Track ${playlist.length + 1}`,
      videoId: videoId
    };

    setPlaylist([...playlist, newItem]);
    setInputUrl('');
    setInputTitle('');
    
    // Auto play if it's the first item
    if (playlist.length === 0) {
      setCurrentIndex(0);
      setIsMinimized(false);
    }
  };

  const handleDeleteItem = (index: number) => {
    const newPlaylist = [...playlist];
    newPlaylist.splice(index, 1);
    setPlaylist(newPlaylist);
    
    if (index === currentIndex && newPlaylist.length > 0) {
      setCurrentIndex(index >= newPlaylist.length ? 0 : index);
    }
  };

  const handleClearPlaylist = () => {
    if (confirm("Hapus semua playlist?")) {
      setPlaylist([]);
      setCurrentIndex(0);
    }
  };

  const handleNext = () => {
    if (playlist.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % playlist.length);
  };

  const handlePrev = () => {
    if (playlist.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
  };

  // Widget Classes
  const widgetClasses = `fixed bottom-4 right-4 bg-slate-900 text-white rounded-xl shadow-2xl z-[100] transition-all duration-300 border border-slate-700 overflow-hidden flex flex-col ${isMinimized ? 'w-16 h-16 rounded-full' : 'w-80 md:w-96 h-[500px]'}`;

  if (isMinimized) {
    return (
      <div className={widgetClasses}>
        <button 
          onClick={() => setIsMinimized(false)}
          className="w-full h-full flex items-center justify-center hover:bg-slate-800 transition-colors relative group"
        >
          {playlist.length > 0 ? (
             <div className="animate-pulse absolute inset-0 bg-red-600/20 rounded-full"></div>
          ) : null}
          <Music size={24} className="text-white" />
          {playlist.length > 0 && (
             <span className="absolute -top-1 -right-1 bg-red-600 text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-900">
               {playlist.length}
             </span>
          )}
        </button>
      </div>
    );
  }

  const currentVideo = playlist[currentIndex];

  return (
    <div className={widgetClasses}>
      {/* Header */}
      <div className="p-3 bg-slate-800 border-b border-slate-700 flex justify-between items-center cursor-move">
         <div className="flex items-center gap-2">
            <Youtube size={18} className="text-red-500" />
            <span className="text-xs font-bold uppercase tracking-wider">Media Player</span>
         </div>
         <div className="flex items-center gap-1">
            <button onClick={() => setIsMinimized(true)} className="p-1 hover:bg-slate-700 rounded"><Minimize2 size={14}/></button>
         </div>
      </div>

      {/* Video Area */}
      <div className="relative w-full pt-[56.25%] bg-black group">
        {currentVideo ? (
          <iframe
            className="absolute top-0 left-0 w-full h-full"
            src={`https://www.youtube.com/embed/${currentVideo.videoId}?autoplay=1&enablejsapi=1`}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        ) : (
          <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center text-slate-500">
             <Music size={32} className="mb-2 opacity-50"/>
             <span className="text-xs">Playlist Kosong</span>
          </div>
        )}
      </div>

      {/* Controls & Info */}
      <div className="p-4 bg-slate-900 flex flex-col gap-2">
         {currentVideo ? (
             <div className="mb-2">
               <h4 className="font-semibold text-sm truncate">{currentVideo.title}</h4>
               <p className="text-[10px] text-slate-400">Track {currentIndex + 1} of {playlist.length}</p>
             </div>
         ) : (
             <div className="mb-2 h-10"></div>
         )}
         
         <div className="flex justify-center items-center gap-4 mb-2">
            <button onClick={handlePrev} className="p-2 hover:bg-slate-800 rounded-full text-slate-300 hover:text-white"><SkipBack size={20}/></button>
            <div className="w-10 h-10 flex items-center justify-center bg-red-600 rounded-full shadow-lg">
                <Play size={20} fill="white" className="ml-1"/>
            </div>
            <button onClick={handleNext} className="p-2 hover:bg-slate-800 rounded-full text-slate-300 hover:text-white"><SkipForward size={20}/></button>
         </div>

         <div className="flex justify-between items-center border-t border-slate-800 pt-2">
             <button onClick={() => setShowPlaylist(!showPlaylist)} className={`text-xs flex items-center gap-1 px-2 py-1 rounded ${showPlaylist ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>
               <List size={14} /> {showPlaylist ? 'Hide List' : 'Show List'}
             </button>
         </div>
      </div>

      {/* Playlist & Add Section */}
      <div className="flex-1 overflow-hidden flex flex-col bg-slate-800/50">
         {showPlaylist ? (
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {playlist.map((item, idx) => (
                   <div key={item.id} className={`flex justify-between items-center p-2 rounded text-xs group ${idx === currentIndex ? 'bg-red-600/20 border border-red-600/50' : 'hover:bg-slate-800'}`}>
                      <button onClick={() => setCurrentIndex(idx)} className="flex-1 text-left truncate flex items-center gap-2">
                         {idx === currentIndex && <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>}
                         <span className={idx === currentIndex ? 'text-red-400 font-medium' : 'text-slate-300'}>{item.title}</span>
                      </button>
                      <button onClick={() => handleDeleteItem(idx)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400">
                         <Trash2 size={12} />
                      </button>
                   </div>
                ))}
                {playlist.length === 0 && <p className="text-center text-xs text-slate-500 py-4">Belum ada lagu.</p>}
            </div>
         ) : (
            <div className="flex-1 p-4 flex flex-col gap-3">
               <div className="text-xs font-semibold text-slate-400 uppercase">Tambah Media Baru</div>
               <input 
                 className="bg-slate-800 border border-slate-700 text-white text-xs rounded p-2 focus:ring-1 focus:ring-red-500 outline-none"
                 placeholder="Paste YouTube Link..."
                 value={inputUrl}
                 onChange={e => setInputUrl(e.target.value)}
               />
               <input 
                 className="bg-slate-800 border border-slate-700 text-white text-xs rounded p-2 focus:ring-1 focus:ring-red-500 outline-none"
                 placeholder="Judul (Opsional)"
                 value={inputTitle}
                 onChange={e => setInputTitle(e.target.value)}
               />
               <button onClick={handleAddVideo} className="bg-slate-700 hover:bg-slate-600 text-white text-xs py-2 rounded font-medium flex items-center justify-center gap-2">
                 <Plus size={14} /> Tambah ke Playlist
               </button>
               
               {playlist.length > 0 && (
                   <button onClick={handleClearPlaylist} className="mt-auto text-xs text-red-400 hover:text-red-300 flex items-center justify-center gap-1 py-2">
                     <Trash2 size={12}/> Clear Playlist
                   </button>
               )}
            </div>
         )}
      </div>
    </div>
  );
};

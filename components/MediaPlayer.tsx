
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Plus, Trash2, List, X, Youtube, ExternalLink, AlertCircle, FolderPlus, Music } from 'lucide-react';
import { api } from '../services/api';
import { Playlist, PlaylistItem } from '../types';

interface MediaPlayerProps {
  isOpen: boolean;
  onClose: void;
  onPlayingChange: (isPlaying: boolean) => void;
}

export const MediaPlayer: React.FC<MediaPlayerProps> = ({ isOpen, onClose, onPlayingChange }) => {
  // Database State
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string>('');
  const [items, setItems] = useState<PlaylistItem[]>([]);
  
  // Player State
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // UI State
  const [inputUrl, setInputUrl] = useState('');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load Playlists on Open
  useEffect(() => {
    if (isOpen) {
      loadPlaylists();
    }
  }, [isOpen]);

  // Load Items when Playlist changes
  useEffect(() => {
    if (currentPlaylistId) {
      loadItems(currentPlaylistId);
    } else {
      setItems([]);
    }
  }, [currentPlaylistId]);

  const loadPlaylists = async () => {
    const data = await api.getPlaylists();
    setPlaylists(data);
    if (data.length > 0 && !currentPlaylistId) {
      setCurrentPlaylistId(data[0].id);
    }
  };

  const loadItems = async (pid: string) => {
    setIsLoading(true);
    const data = await api.getPlaylistItems(pid);
    setItems(data);
    setIsLoading(false);
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    await api.createPlaylist(newPlaylistName);
    setNewPlaylistName('');
    setIsCreatingPlaylist(false);
    loadPlaylists();
  };

  const handleDeletePlaylist = async (id: string) => {
    if (confirm("Hapus playlist ini beserta isinya?")) {
      await api.deletePlaylist(id);
      if (currentPlaylistId === id) setCurrentPlaylistId('');
      loadPlaylists();
    }
  };

  // Extract YouTube ID (Robust Regex)
  const getYouTubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleAddVideo = async () => {
    setErrorMsg('');
    if (!currentPlaylistId) {
      setErrorMsg("Pilih atau buat playlist terlebih dahulu.");
      return;
    }
    if (!inputUrl.trim()) return;
    
    const videoId = getYouTubeId(inputUrl);
    if (!videoId) {
      setErrorMsg("Link tidak valid. Gunakan link YouTube standar.");
      return;
    }

    // Try to get title from oEmbed or just use Generic ID
    let title = `Video ${videoId}`;
    try {
        const res = await fetch(`https://noembed.com/embed?url=${inputUrl}`);
        const data = await res.json();
        if (data.title) title = data.title;
    } catch (e) { console.log("Failed to fetch title"); }

    const newItem: Partial<PlaylistItem> = {
      id: Date.now().toString(),
      title: title,
      url: inputUrl,
      videoId: videoId
    };

    await api.addPlaylistItem(currentPlaylistId, newItem);
    setInputUrl('');
    loadItems(currentPlaylistId);
  };

  const handleDeleteItem = async (itemId: string, index: number) => {
    await api.deletePlaylistItem(itemId);
    
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);

    if (index === currentIndex) {
        if (newItems.length === 0) {
            setIsPlaying(false);
        } else {
            setCurrentIndex(index >= newItems.length ? 0 : index);
        }
    } else if (index < currentIndex) {
        setCurrentIndex(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (items.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % items.length);
    setIsPlaying(true);
  };

  const handlePrev = () => {
    if (items.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
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
    if (items.length > 0) {
      // Auto play when switching track
      setIsPlaying(true);
    }
  }, [currentIndex]);

  useEffect(() => {
    onPlayingChange(isPlaying);
  }, [isPlaying, onPlayingChange]);

  // Render Logic
  if (!isOpen) return null;

  const currentVideo = items[currentIndex];
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl h-[600px] flex overflow-hidden border border-slate-700 animate-scale-in">
        
        {/* LEFT PANEL: PLAYER (40%) */}
        <div className="w-2/5 bg-black flex flex-col relative border-r border-slate-800">
             {/* Header Player */}
             <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-10 flex justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-900/50">
                        <Youtube size={18} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white leading-none">Warehouse Radio</h3>
                        <p className="text-[10px] text-slate-400">Global System Player</p>
                    </div>
                </div>
             </div>

             {/* Video Area */}
             <div className="flex-1 flex items-center justify-center bg-black relative">
                {currentVideo ? (
                    <iframe
                        ref={iframeRef}
                        key={currentVideo.id} 
                        className="w-full aspect-video"
                        src={`https://www.youtube.com/embed/${currentVideo.videoId}?autoplay=1&enablejsapi=1&controls=1&rel=0&playsinline=1&origin=${origin}`}
                        title="YouTube video player"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                    ></iframe>
                ) : (
                    <div className="text-center p-8 opacity-50">
                        <Music size={48} className="mx-auto mb-2 text-slate-600"/>
                        <p className="text-slate-500 text-sm">Pilih lagu dari playlist</p>
                    </div>
                )}
             </div>

             {/* Controls */}
             <div className="p-6 bg-slate-900 border-t border-slate-800">
                 <div className="mb-4">
                     <h4 className="text-white font-bold truncate text-lg">{currentVideo?.title || 'No Track Selected'}</h4>
                     <p className="text-xs text-slate-500 flex items-center gap-2">
                        {currentPlaylistsName(playlists, currentPlaylistId)} 
                        {currentVideo && <ExternalLink size={10} className="cursor-pointer hover:text-blue-400"/>}
                     </p>
                 </div>
                 
                 <div className="flex justify-center items-center gap-8">
                    <button onClick={handlePrev} className="text-slate-400 hover:text-white transition-colors"><SkipBack size={24}/></button>
                    <button 
                        onClick={togglePlay}
                        className={`w-14 h-14 flex items-center justify-center rounded-full shadow-lg hover:scale-105 transition-all active:scale-95 ${isPlaying ? 'bg-red-600 text-white' : 'bg-white text-slate-900'}`}
                    >
                        {isPlaying ? <Pause size={24} fill="currentColor"/> : <Play size={24} fill="currentColor" className="ml-1"/>}
                    </button>
                    <button onClick={handleNext} className="text-slate-400 hover:text-white transition-colors"><SkipForward size={24}/></button>
                 </div>
             </div>
        </div>

        {/* RIGHT PANEL: PLAYLIST MANAGEMENT (60%) */}
        <div className="w-3/5 bg-slate-900 flex flex-col">
             {/* Header Playlist */}
             <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                 <div className="flex items-center gap-3">
                     <div className="relative">
                         <select 
                            value={currentPlaylistId} 
                            onChange={e => setCurrentPlaylistId(e.target.value)}
                            className="appearance-none bg-slate-800 text-white pl-4 pr-10 py-2 rounded-lg text-sm font-medium border border-slate-700 outline-none focus:border-red-500 transition-colors cursor-pointer min-w-[200px]"
                         >
                            <option value="" disabled>Pilih Playlist...</option>
                            {playlists.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                         </select>
                         <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                             <List size={14} />
                         </div>
                     </div>
                     <button 
                        onClick={() => setIsCreatingPlaylist(!isCreatingPlaylist)}
                        className={`p-2 rounded-lg transition-colors ${isCreatingPlaylist ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                        title="Buat Playlist Baru"
                     >
                        <FolderPlus size={18} />
                     </button>
                     {currentPlaylistId && (
                         <button 
                            onClick={() => handleDeletePlaylist(currentPlaylistId)}
                            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-slate-700 transition-colors"
                            title="Hapus Playlist Ini"
                         >
                            <Trash2 size={18} />
                         </button>
                     )}
                 </div>
                 <button onClick={() => (onClose as any)()} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-full transition-colors">
                     <X size={24} />
                 </button>
             </div>

             {/* Create Playlist Form */}
             {isCreatingPlaylist && (
                 <div className="p-4 bg-slate-800/50 border-b border-slate-800 animate-fade-in-down">
                     <div className="flex gap-2">
                         <input 
                            type="text" 
                            placeholder="Nama Playlist Baru..." 
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-red-500"
                            value={newPlaylistName}
                            onChange={e => setNewPlaylistName(e.target.value)}
                         />
                         <button onClick={handleCreatePlaylist} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-bold">
                            Buat
                         </button>
                     </div>
                 </div>
             )}

             {/* Add Song Input */}
             <div className="p-4 border-b border-slate-800">
                 <div className="flex gap-2">
                     <input 
                        type="text" 
                        placeholder="Tempel Link YouTube disini..." 
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500 placeholder-slate-500"
                        value={inputUrl}
                        onChange={e => setInputUrl(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddVideo()}
                     />
                     <button onClick={handleAddVideo} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all active:scale-95">
                        <Plus size={16} /> Tambah
                     </button>
                 </div>
                 {errorMsg && <div className="text-xs text-red-400 mt-2 flex items-center gap-1"><AlertCircle size={12}/> {errorMsg}</div>}
             </div>

             {/* Song List */}
             <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900/50">
                 {isLoading ? (
                     <div className="p-8 text-center text-slate-500 text-sm">Loading playlist...</div>
                 ) : items.length > 0 ? (
                     items.map((item, idx) => (
                         <div 
                            key={item.id} 
                            className={`flex justify-between items-center px-4 py-3 border-b border-slate-800/50 group transition-colors cursor-pointer ${idx === currentIndex ? 'bg-red-900/20 border-l-4 border-l-red-500' : 'hover:bg-slate-800 border-l-4 border-l-transparent'}`}
                            onClick={() => setCurrentIndex(idx)}
                         >
                            <div className="flex items-center gap-4 overflow-hidden">
                                <span className={`text-xs w-4 font-mono ${idx === currentIndex ? 'text-red-500 font-bold' : 'text-slate-600'}`}>{idx + 1}</span>
                                <div className="flex flex-col truncate">
                                    <span className={`text-sm truncate ${idx === currentIndex ? 'text-white font-medium' : 'text-slate-300'}`}>{item.title}</span>
                                    <span className="text-[10px] text-slate-500 truncate">{item.url}</span>
                                </div>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id, idx); }}
                                className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-500 hover:bg-slate-900 rounded-lg transition-all"
                            >
                                <Trash2 size={16} />
                            </button>
                         </div>
                     ))
                 ) : (
                     <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                        <List size={48} className="mb-2"/>
                        <p className="text-sm">Playlist Kosong</p>
                     </div>
                 )}
             </div>
        </div>

      </div>
    </div>
  );
};

// Helper
const currentPlaylistsName = (playlists: Playlist[], id: string) => {
    const p = playlists.find(x => x.id === id);
    return p ? p.name : 'Unknown Playlist';
}

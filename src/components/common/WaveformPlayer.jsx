import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

const WaveformPlayer = ({ audioUrl, isOwn }) => {
  const containerRef = useRef(null);
  const wavesurferRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    // Tùy chỉnh màu sắc tùy thuộc vào việc tin nhắn là của mình hay của người khác
    const waveColor = isOwn ? 'rgba(255, 255, 255, 0.4)' : 'rgba(99, 102, 241, 0.3)'; // indigo-500
    const progressColor = isOwn ? 'rgba(255, 255, 255, 1)' : 'rgba(79, 70, 229, 1)'; // indigo-600
    
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: waveColor,
      progressColor: progressColor,
      barWidth: 3,
      barGap: 2,
      barRadius: 3,
      height: 40,
      url: audioUrl,
      cursorWidth: 0,
      normalize: true,
    });

    wavesurferRef.current = ws;

    ws.on('ready', () => {
      setDuration(ws.getDuration());
    });

    ws.on('audioprocess', () => {
      setCurrentTime(ws.getCurrentTime());
    });

    ws.on('interaction', () => {
      setCurrentTime(ws.getCurrentTime());
    });

    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));

    ws.on('finish', () => {
      setIsPlaying(false);
      ws.seekTo(0);
      setCurrentTime(0);
    });

    return () => {
      ws.destroy();
    };
  }, [audioUrl, isOwn]);

  const handlePlayPause = (e) => {
    e.stopPropagation();
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause();
    }
  };

  return (
    <div className="flex items-center gap-3 min-w-[220px] sm:min-w-[260px] p-0.5">
      {/* Nút Play / Pause */}
      <button 
        onClick={handlePlayPause}
        className={`flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-full transition-colors ${
          isOwn 
            ? 'bg-white/20 text-white hover:bg-white/30' 
            : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
        }`}
      >
        {isPlaying ? (
          // Icon Pause
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
          </svg>
        ) : (
          // Icon Play
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 ml-1">
            <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {/* Sóng âm */}
      <div className="flex-1 flex flex-col justify-center overflow-hidden">
        <div ref={containerRef} className="w-full cursor-pointer" />
        <div className={`text-[11px] font-medium mt-1 tracking-wide ${isOwn ? 'text-white/80' : 'text-slate-500'}`}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  );
};

export default WaveformPlayer;

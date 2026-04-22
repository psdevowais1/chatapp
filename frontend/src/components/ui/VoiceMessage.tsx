'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface VoiceMessageProps {
  url: string;
  duration?: number;
  isOwn: boolean;
}

export default function VoiceMessage({ url, duration, isOwn }: VoiceMessageProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const [waveform, setWaveform] = useState<number[]>([]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration);
      generateWaveform();
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const generateWaveform = () => {
    // Generate random waveform bars for visual effect
    const bars = 30;
    const waves: number[] = [];
    for (let i = 0; i < bars; i++) {
      waves.push(Math.random() * 0.6 + 0.2);
    }
    setWaveform(waves);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audioDuration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * audioDuration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className={`flex items-center gap-3 min-w-[200px] max-w-[280px] p-2`}>
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all"
        style={{ background: 'var(--foreground)', color: 'var(--background)' }}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>

      {/* Waveform & Progress */}
      <div className="flex-1 min-w-0">
        <div
          className="relative h-8 flex items-center gap-0.5 cursor-pointer group"
          onClick={handleSeek}
        >
          {/* Waveform bars */}
          <div className="absolute inset-0 flex items-center gap-0.5">
            {waveform.map((height, index) => {
              const barProgress = (index / waveform.length) * 100;
              const isActive = barProgress < progress;

              return (
                <div
                  key={index}
                  className="flex-1 rounded-full transition-all"
                  style={{
                    height: `${height * 100}%`,
                    minHeight: '4px',
                    background: isActive ? 'var(--foreground)' : 'var(--text-muted)'
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Duration */}
        <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          {isPlaying ? formatTime(currentTime) : formatTime(audioDuration)}
        </div>
      </div>
    </div>
  );
}

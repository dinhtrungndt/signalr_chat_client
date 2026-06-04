import React, { useState, useEffect, useRef } from 'react';
import { useUIStore } from '../../stores/ui.store';

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const AudioRecorder = ({ onSend, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const streamRef = useRef(null);
  const isCancelledRef = useRef(false); // Cờ chặn gửi khi hủy

  const startRecording = async () => {
    try {
      isCancelledRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0 && !isCancelledRef.current) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // CHỈ gửi khi KHÔNG bị hủy và có dữ liệu thực sự
        if (!isCancelledRef.current && audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          onSend(audioBlob);
        }
      };

      mediaRecorder.start(200); // Collect data every 200ms
      setIsRecording(true);
      
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Không thể truy cập Microphone:', err);
      useUIStore.getState().showAlert('Vui lòng cấp quyền truy cập Microphone để gửi tin nhắn giọng nói!', 'error');
      onCancel();
    }
  };

  const stopRecordingAndSend = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      clearInterval(timerIntervalRef.current);
    }
  };

  const cancelRecording = (triggerParent = true) => {
    isCancelledRef.current = true; // Đánh dấu HỦY trước khi stop
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    audioChunksRef.current = [];
    clearInterval(timerIntervalRef.current);
    if (triggerParent && onCancel) {
      onCancel();
    }
  };

  useEffect(() => {
    // Start automatically when mounted
    startRecording();
    return () => {
      cancelRecording(false); // Không gọi onCancel để tránh dính đòn React 18 Strict Mode
    };
  }, []);

  return (
    <div className="flex-1 flex items-center justify-between bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-2 min-h-[44px]">
      <div className="flex items-center gap-3">
        {/* Pulsating dot */}
        <div className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </div>
        <span className="text-red-500 font-medium font-mono">
          {formatTime(recordingTime)}
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400 ml-2 animate-pulse">Đang ghi âm...</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={cancelRecording}
          className="px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition font-medium"
        >
          Huỷ
        </button>
        <button
          onClick={stopRecordingAndSend}
          className="w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center hover:bg-indigo-600 transition shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          title="Gửi"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 ml-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default AudioRecorder;

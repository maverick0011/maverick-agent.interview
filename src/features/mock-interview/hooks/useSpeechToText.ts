/**
 * Web Speech Recognition & Speech Analytics Hook
 * Converts spoken answers to text live, tracks speaking pace (WPM),
 * counts filler words, and measures pause frequency.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { SpeechMetrics } from '../types';

const COMMON_FILLERS = ['um', 'uh', 'like', 'basically', 'actually', 'literally', 'you know', 'sort of', 'kind of'];

export function useSpeechToText() {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [wpm, setWpm] = useState(0);
  const [fillerCount, setFillerCount] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<any>(null);
  const pauseCountRef = useRef<number>(0);
  const lastSpeechTimeRef = useRef<number>(0);
  const fillersRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
      const recog = new SpeechRecognition();
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = 'en-US';

      recog.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalTranscript += res[0].transcript + ' ';
          } else {
            interimTranscript += res[0].transcript;
          }
        }

        const fullText = (finalTranscript + interimTranscript).trim();
        setTranscript(fullText);

        // Pause detection (speech gap > 2.2 seconds)
        const now = Date.now();
        if (lastSpeechTimeRef.current > 0 && now - lastSpeechTimeRef.current > 2200) {
          pauseCountRef.current++;
        }
        lastSpeechTimeRef.current = now;

        // Calculate WPM and filler words
        updateMetrics(fullText);
      };

      recog.onerror = (e: any) => {
        // Handle silently or restart if not aborted
        if (e.error !== 'aborted') {
          setIsListening(false);
        }
      };

      recog.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recog;
    }
  }, []);

  const updateMetrics = useCallback((text: string) => {
    const words = text.split(/\s+/).filter(Boolean);
    const elapsedMinutes = Math.max(0.05, (Date.now() - startTimeRef.current) / 60000);
    const currentWpm = Math.round(words.length / elapsedMinutes);
    setWpm(currentWpm);

    // Count filler words
    const lower = text.toLowerCase();
    let totalFillers = 0;
    const fillerMap: Record<string, number> = {};

    COMMON_FILLERS.forEach(filler => {
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      const matches = lower.match(regex);
      if (matches) {
        fillerMap[filler] = matches.length;
        totalFillers += matches.length;
      }
    });

    fillersRef.current = fillerMap;
    setFillerCount(totalFillers);
  }, []);

  const startListening = useCallback(() => {
    setTranscript('');
    setDurationSec(0);
    setWpm(0);
    setFillerCount(0);
    pauseCountRef.current = 0;
    fillersRef.current = {};
    startTimeRef.current = Date.now();
    lastSpeechTimeRef.current = Date.now();

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setDurationSec(Math.round((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        // Already started
      }
    } else {
      setIsListening(true);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignored
      }
    }
    setIsListening(false);
  }, []);

  const reset = useCallback(() => {
    stopListening();
    setTranscript('');
    setDurationSec(0);
    setWpm(0);
    setFillerCount(0);
    pauseCountRef.current = 0;
    fillersRef.current = {};
  }, [stopListening]);

  const getMetrics = useCallback((): SpeechMetrics => {
    const words = transcript.split(/\s+/).filter(Boolean);
    const duration = Math.max(1, durationSec);
    const calculatedWpm = Math.round((words.length / duration) * 60);

    return {
      durationSec: duration,
      wordCount: words.length,
      wpm: calculatedWpm || wpm,
      fillerCount,
      fillerWords: { ...fillersRef.current },
      pauseCount: pauseCountRef.current,
      averagePauseSec: pauseCountRef.current > 0 ? Math.round((duration / pauseCountRef.current) * 10) / 10 : 0,
    };
  }, [transcript, durationSec, wpm, fillerCount]);

  return {
    transcript,
    setTranscript,
    isListening,
    isSupported,
    wpm,
    fillerCount,
    durationSec,
    startListening,
    stopListening,
    reset,
    getMetrics,
  };
}

/**
 * Mock Interview Page - Maverick AI Studio
 * Real technical interview simulation with track selection, seniority selection,
 * 10 tool-level topics, live voice-to-text transcription, camera & posture skeleton overlay,
 * server-side Gemini question generation (with no-repeat history), and Cloud Firestore persistence.
 */

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  InterviewSessionConfig,
  InterviewAttempt,
  InterviewQuestion,
} from '../features/mock-interview/types';
import { TopicSelector } from '../features/mock-interview/components/TopicSelector';
import { PreCheckModal } from '../features/mock-interview/components/PreCheckModal';
import { InterviewSession } from '../features/mock-interview/components/InterviewSession';
import { ResultsView } from '../features/mock-interview/components/ResultsView';
import { questionBankService } from '../features/mock-interview/services/questionBank';
import { videoProctorService } from '../services/videoProctorService';
import { localStore } from '../database/localStore';
import { firestoreService } from '../services/firestoreService';

export const MockInterviewPage: React.FC = () => {
  const currentUser = localStore.getCurrentUser();
  const interviewSettings = localStore.getInterviewSettings();

  const [config, setConfig] = useState<InterviewSessionConfig>({
    track: 'devops',
    seniority: 'senior',
    selectedTopics: ['Linux', 'Docker', 'Kubernetes'],
    questionCount: interviewSettings.defaultQuestionsPerSession || 10,
    timePerAnswerSec: interviewSettings.defaultTimePerAnswerSec || 120,
    thinkingTimeSec: 10,
    readAloud: true,
  });

  const [stage, setStage] = useState<'config' | 'precheck' | 'session' | 'results'>('config');
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [activeQuestions, setActiveQuestions] = useState<InterviewQuestion[]>([]);
  const [activeMediaStream, setActiveMediaStream] = useState<MediaStream | null>(null);
  const [completedAttempt, setCompletedAttempt] = useState<InterviewAttempt | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const loadUniqueQuestions = async (): Promise<InterviewQuestion[]> => {
    setIsGeneratingQuestions(true);
    try {
      let remoteHashes: string[] = [];
      if (firestoreService.isAuthenticated()) {
        try {
          remoteHashes = await firestoreService.getUserQuestionHistory(currentUser.id);
        } catch {
          // Proceed with local history if Firestore read fails
        }
      }

      const { questions } = await questionBankService.generateQuestionsWithFallback(
        currentUser.id,
        config.selectedTopics,
        config.seniority,
        config.questionCount,
        remoteHashes
      );
      return questions;
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  // 1. Proceed to Pre-check
  const handleProceedToPreCheck = () => {
    setStage('precheck');
  };

  // 2. Start Session after Hardware Pre-Check
  const handleStartSession = async (stream: MediaStream | null) => {
    setActiveMediaStream(stream);
    const questions = await loadUniqueQuestions();
    const sessionId = `mock_session_${Date.now()}`;
    setActiveSessionId(sessionId);
    setActiveQuestions(questions);
    setStage('session');

    videoProctorService.startProctoringBroadcast({
      sessionId,
      studentId: currentUser.id,
      studentName: currentUser.fullName,
      track: `${config.track.toUpperCase()} (${config.selectedTopics.join(', ')})`,
      difficulty: config.seniority,
      currentQuestion: questions[0]?.question || '',
      totalQuestions: questions.length,
      currentQuestionIndex: 0,
    });

    if (firestoreService.isAuthenticated()) {
      firestoreService
        .upsertProctoredFeed({
          sessionId,
          studentId: currentUser.id,
          studentName: currentUser.fullName,
          track: `${config.track.toUpperCase()} (${config.selectedTopics.join(', ')})`,
          difficulty: config.seniority,
          startedAt: new Date().toISOString(),
          currentQuestionIndex: 0,
          totalQuestions: questions.length,
          currentQuestion: questions[0]?.question || '',
          currentTranscript: 'Candidate started mock interview session',
          isCameraActive: !!stream,
          isAudioActive: true,
          status: 'live',
          lastHeartbeat: new Date().toISOString(),
        })
        .catch(() => {});

      firestoreService
        .logActivity({
          userId: currentUser.id,
          userEmail: currentUser.email,
          userName: currentUser.fullName,
          action: 'mock_interview_start',
          description: `Started ${config.track.toUpperCase()} mock round (${config.selectedTopics.join(', ')})`,
        })
        .catch(() => {});
    }

    localStore.logUserActivity({
      userId: currentUser.id,
      userEmail: currentUser.email,
      userName: currentUser.fullName,
      action: 'mock_interview_start',
      description: `Started ${config.track.toUpperCase()} mock round (${config.selectedTopics.join(', ')})`,
    });
  };

  // 3. Complete Session and Record to Firestore + LocalStore
  const handleSessionComplete = async (attempt: InterviewAttempt) => {
    videoProctorService.stopProctoring();
    setCompletedAttempt(attempt);
    localStore.saveInterviewAttempt(attempt);

    if (activeSessionId && firestoreService.isAuthenticated()) {
      firestoreService.deleteProctoredFeed(activeSessionId).catch(() => {});
    }

    if (firestoreService.isAuthenticated()) {
      const settings = localStore.getInterviewSettings();
      firestoreService.saveInterviewAttempt(attempt, settings.passThreshold).catch(err => {
        console.warn('Firestore attempt sync warning:', err);
      });
      firestoreService
        .logActivity({
          userId: currentUser.id,
          userEmail: currentUser.email,
          userName: currentUser.fullName,
          action: 'mock_interview_complete',
          description: `Completed interview assessment with overall score ${attempt.overallScore}% (${attempt.passed ? 'PASSED' : 'RETRY'})`,
        })
        .catch(() => {});
    }

    localStore.logUserActivity({
      userId: currentUser.id,
      userEmail: currentUser.email,
      userName: currentUser.fullName,
      action: 'mock_interview_complete',
      description: `Completed interview assessment with overall score ${attempt.overallScore}% (${attempt.passed ? 'PASSED 80%+' : 'RETRY'})`,
    });

    setStage('results');
  };

  // 4. Retry with fresh questions
  const handleRetry = async () => {
    const freshQuestions = await loadUniqueQuestions();
    setActiveQuestions(freshQuestions);
    setStage('session');
  };

  // 5. Exit or reset back to topic selector
  const handleResetToConfig = () => {
    videoProctorService.stopProctoring();
    if (activeSessionId && firestoreService.isAuthenticated()) {
      firestoreService.deleteProctoredFeed(activeSessionId).catch(() => {});
    }
    if (activeMediaStream) {
      activeMediaStream.getTracks().forEach(t => t.stop());
      setActiveMediaStream(null);
    }
    setStage('config');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Technical Mock Interview Simulator
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Real-time simulated technical interview assessing body posture, communication, word formation, and technical architecture depth.
          </p>
        </div>

        {/* Candidate Status Indicator */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs">
          <span className="text-neutral-400">Candidate:</span>
          <span className="font-bold text-white">{currentUser.fullName}</span>
          <span className="text-neutral-600">·</span>
          <span className="font-mono text-indigo-400 text-[11px]">{currentUser.email}</span>
        </div>
      </div>

      {/* Question Generation Loading Overlay */}
      {isGeneratingQuestions && (
        <div className="p-8 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col items-center justify-center gap-3 text-center">
          <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
          <div className="text-sm font-semibold text-white">
            Generating Unique Technical Questions...
          </div>
          <p className="text-xs text-neutral-400 max-w-md">
            Checking your prior question history and preparing non-repeating questions across {config.selectedTopics.join(', ')}.
          </p>
        </div>
      )}

      {/* Main Feature Viewport */}
      {!isGeneratingQuestions && stage === 'config' && (
        <TopicSelector
          config={config}
          onChangeConfig={setConfig}
          onProceedToPreCheck={handleProceedToPreCheck}
        />
      )}

      {!isGeneratingQuestions && stage === 'session' && (
        <InterviewSession
          config={config}
          questions={activeQuestions}
          userId={currentUser.id}
          candidateName={currentUser.fullName}
          mediaStream={activeMediaStream}
          onSessionComplete={handleSessionComplete}
          onExit={handleResetToConfig}
        />
      )}

      {!isGeneratingQuestions && stage === 'results' && completedAttempt && (
        <ResultsView
          attempt={completedAttempt}
          onRetry={handleRetry}
          onSelectNewTopics={handleResetToConfig}
        />
      )}

      {/* Camera & Hardware Pre-Check Modal */}
      <PreCheckModal
        isOpen={stage === 'precheck'}
        onClose={() => setStage('config')}
        onReadyToStart={handleStartSession}
      />
    </div>
  );
};

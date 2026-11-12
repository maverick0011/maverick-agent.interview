/**
 * Mock Interview Page - Maverick AI Studio
 * Real technical interview simulation with track selection, seniority selection,
 * 10 tool-level topics, live voice-to-text transcription, camera & posture skeleton overlay,
 * and 5-dimension rubric evaluation with the 80% Pass/Completion rule.
 * (Note: Proctored live stream warning badges have been completely removed as requested).
 */

import React, { useState } from 'react';
import { 
  InterviewSessionConfig, 
  InterviewAttempt, 
  InterviewQuestion 
} from '../features/mock-interview/types';
import { TopicSelector } from '../features/mock-interview/components/TopicSelector';
import { PreCheckModal } from '../features/mock-interview/components/PreCheckModal';
import { InterviewSession } from '../features/mock-interview/components/InterviewSession';
import { ResultsView } from '../features/mock-interview/components/ResultsView';
import { questionBankService } from '../features/mock-interview/services/questionBank';
import { videoProctorService } from '../services/videoProctorService';
import { localStore } from '../database/localStore';

export const MockInterviewPage: React.FC = () => {
  const currentUser = localStore.getCurrentUser();

  const [config, setConfig] = useState<InterviewSessionConfig>({
    track: 'devops',
    seniority: 'senior',
    selectedTopics: ['Linux', 'Docker', 'Kubernetes'],
    questionCount: 10,
    timePerAnswerSec: 120,
    thinkingTimeSec: 10,
    readAloud: true,
  });

  const [stage, setStage] = useState<'config' | 'precheck' | 'session' | 'results'>('config');
  const [activeQuestions, setActiveQuestions] = useState<InterviewQuestion[]>([]);
  const [activeMediaStream, setActiveMediaStream] = useState<MediaStream | null>(null);
  const [completedAttempt, setCompletedAttempt] = useState<InterviewAttempt | null>(null);

  // 1. Proceed to Pre-check
  const handleProceedToPreCheck = () => {
    setStage('precheck');
  };

  // 2. Start Session after Hardware Pre-Check
  const handleStartSession = (stream: MediaStream | null) => {
    setActiveMediaStream(stream);

    // Retrieve fresh questions for this user from the selected topics with NO REPEATS
    const questions = questionBankService.getQuestionsForSession(
      currentUser.id,
      config.selectedTopics,
      config.seniority,
      config.questionCount
    );

    setActiveQuestions(questions);
    setStage('session');

    // Transmit live stream feed to evaluator mavbharath01@gmail.com
    videoProctorService.startProctoringBroadcast({
      sessionId: `mock-session-${Date.now()}`,
      studentId: currentUser.id,
      studentName: currentUser.fullName,
      track: `${config.track.toUpperCase()} (${config.selectedTopics.join(', ')})`,
      difficulty: config.seniority,
      currentQuestion: questions[0]?.question || '',
      totalQuestions: questions.length,
      currentQuestionIndex: 0,
    });

    localStore.logUserActivity({
      userId: currentUser.id,
      userEmail: currentUser.email,
      userName: currentUser.fullName,
      action: 'mock_interview_start',
      description: `Started ${config.track.toUpperCase()} mock round (${config.selectedTopics.join(', ')}). Live stream active for evaluator mavbharath01@gmail.com`,
    });
  };

  // 3. Complete Session and Record to Store
  const handleSessionComplete = (attempt: InterviewAttempt) => {
    videoProctorService.stopProctoring();
    setCompletedAttempt(attempt);
    localStore.saveInterviewAttempt(attempt);

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
  const handleRetry = () => {
    const freshQuestions = questionBankService.getQuestionsForSession(
      currentUser.id,
      config.selectedTopics,
      config.seniority,
      config.questionCount
    );
    setActiveQuestions(freshQuestions);
    setStage('session');
  };

  // 5. Exit or reset back to topic selector
  const handleResetToConfig = () => {
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
          <span className="text-neutral-600">·</span>
          <span className="text-[11px] font-mono text-amber-300">
            Evaluator: mavbharath01@gmail.com
          </span>
        </div>
      </div>

      {/* Main Feature Viewport */}
      {stage === 'config' && (
        <TopicSelector
          config={config}
          onChangeConfig={setConfig}
          onProceedToPreCheck={handleProceedToPreCheck}
        />
      )}

      {stage === 'session' && (
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

      {stage === 'results' && completedAttempt && (
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

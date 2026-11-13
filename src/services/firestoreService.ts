/**
 * Cloud Firestore Service Layer
 * Synchronizes Firebase Auth users, access approvals, activity audit logs,
 * mock interview attempts, question history, high-water completion status,
 * admin settings, and live proctoring telemetry with Cloud Firestore.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { isAdminEmail, UserActivityLog } from '../database/localStore';
import {
  UserProfile,
  AccessRequest,
  InterviewAttempt,
  UserInterviewStatus,
  InterviewSettings,
  ProctoredLiveFeed,
} from '../types';

function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
}

function stripUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(item => stripUndefined(item)) as unknown as T;
  }
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Timestamp)) {
    const clean: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      if (val !== undefined) {
        clean[key] = stripUndefined(val);
      }
    }
    return clean as T;
  }
  return obj;
}

function toIsoString(val: unknown): string {
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

class FirestoreService {
  isAuthenticated(): boolean {
    return !!auth.currentUser;
  }

  async syncAuthenticatedUser(firebaseUser: FirebaseUser): Promise<UserProfile> {
    const uid = sanitizeId(firebaseUser.uid);
    const email = (firebaseUser.email || '').trim().toLowerCase();
    const fullName = (firebaseUser.displayName || email.split('@')[0] || 'Candidate').slice(0, 120);
    const avatarUrl = (firebaseUser.photoURL || 'https://lh3.googleusercontent.com/a/default-user').slice(0, 500);
    const adminByEmail = isAdminEmail(email);

    const userPath = `users/${uid}`;
    const userRef = doc(db, 'users', uid);

    try {
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();
        const resolvedRole = adminByEmail ? 'admin' : (data.role as 'admin' | 'student') || 'student';
        const resolvedApproved = adminByEmail ? true : Boolean(data.isApproved);

        // If bootstrapped admin logged in, ensure /admins/{uid} exists
        if (adminByEmail) {
          await this.ensureAdminRecord(uid, email);
        }

        return {
          id: uid,
          fullName: String(data.fullName || fullName),
          email: String(data.email || email),
          role: resolvedRole,
          isApproved: resolvedApproved,
          avatarUrl: String(data.avatarUrl || avatarUrl),
        };
      }

      // First-time sign-in: create /users/{uid}
      const initialRole = adminByEmail ? 'admin' : 'student';
      const initialApproved = adminByEmail ? true : false;

      await setDoc(userRef, {
        uid,
        fullName,
        email,
        role: initialRole,
        isApproved: initialApproved,
        avatarUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (adminByEmail) {
        await this.ensureAdminRecord(uid, email);
      }

      return {
        id: uid,
        fullName,
        email,
        role: initialRole,
        isApproved: initialApproved,
        avatarUrl,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, userPath);
    }
  }

  private async ensureAdminRecord(uid: string, email: string): Promise<void> {
    const adminPath = `admins/${uid}`;
    try {
      const adminRef = doc(db, 'admins', uid);
      const snap = await getDoc(adminRef);
      if (!snap.exists()) {
        await setDoc(adminRef, {
          uid,
          email: email.slice(0, 180),
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, adminPath);
    }
  }

  async submitAccessRequest(params: {
    userId: string;
    fullName: string;
    email: string;
    targetRole: string;
    reason: string;
  }): Promise<AccessRequest> {
    const id = sanitizeId(`req_${params.userId}_${Date.now()}`);
    const path = `access_requests/${id}`;
    const payload = {
      id,
      userId: sanitizeId(params.userId),
      fullName: params.fullName.slice(0, 120),
      email: params.email.slice(0, 180),
      targetRole: params.targetRole.slice(0, 120),
      reason: params.reason.slice(0, 1000),
      status: 'pending' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'access_requests', id), payload);
      return {
        id,
        fullName: payload.fullName,
        email: payload.email,
        targetRole: payload.targetRole,
        reason: payload.reason,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  async approveAccessRequest(requestId: string, approverEmail: string, targetUserId?: string): Promise<void> {
    const id = sanitizeId(requestId);
    const path = `access_requests/${id}`;
    const nowIso = new Date().toISOString();

    try {
      await updateDoc(doc(db, 'access_requests', id), {
        status: 'approved',
        approvedAt: nowIso,
        approvedBy: approverEmail.slice(0, 180),
        updatedAt: serverTimestamp(),
      });

      if (targetUserId) {
        const uid = sanitizeId(targetUserId);
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          await updateDoc(userRef, {
            isApproved: true,
            updatedAt: serverTimestamp(),
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  async rejectAccessRequest(requestId: string): Promise<void> {
    const id = sanitizeId(requestId);
    const path = `access_requests/${id}`;
    try {
      await updateDoc(doc(db, 'access_requests', id), {
        status: 'rejected',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  }

  async logActivity(entry: Omit<UserActivityLog, 'id' | 'timestamp'>): Promise<void> {
    if (!auth.currentUser) return;
    const id = sanitizeId(`act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);
    const path = `user_activity_logs/${id}`;
    try {
      await setDoc(doc(db, 'user_activity_logs', id), {
        id,
        userId: sanitizeId(auth.currentUser.uid),
        userEmail: (entry.userEmail || auth.currentUser.email || 'user@gmail.com').slice(0, 180),
        userName: (entry.userName || auth.currentUser.displayName || 'User').slice(0, 120),
        action: entry.action,
        description: entry.description.slice(0, 500),
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  async saveInterviewAttempt(attempt: InterviewAttempt, passThreshold: number = 80): Promise<void> {
    if (!auth.currentUser) return;
    const uid = sanitizeId(auth.currentUser.uid);
    const attemptId = sanitizeId(attempt.id);
    const attemptPath = `interview_attempts/${attemptId}`;

    try {
      const cleanQuestions = stripUndefined(attempt.questions).slice(0, 30);
      const cleanAnswers = stripUndefined(attempt.answers).slice(0, 30);

      await setDoc(doc(db, 'interview_attempts', attemptId), {
        id: attemptId,
        userId: uid,
        candidateName: attempt.candidateName.slice(0, 120),
        track: attempt.track,
        seniority: attempt.seniority,
        selectedTopics: attempt.selectedTopics.slice(0, 10),
        startedAt: attempt.startedAt.slice(0, 64),
        ...(attempt.endedAt ? { endedAt: attempt.endedAt.slice(0, 64) } : {}),
        questions: cleanQuestions,
        answers: cleanAnswers,
        overallScore: Math.max(0, Math.min(100, Math.round(attempt.overallScore))),
        categoryScores: {
          answerQuality: Math.max(0, Math.min(100, Math.round(attempt.categoryScores.answerQuality))),
          communication: Math.max(0, Math.min(100, Math.round(attempt.categoryScores.communication))),
          wordFormation: Math.max(0, Math.min(100, Math.round(attempt.categoryScores.wordFormation))),
          speakingStyle: Math.max(0, Math.min(100, Math.round(attempt.categoryScores.speakingStyle))),
          posture: Math.max(0, Math.min(100, Math.round(attempt.categoryScores.posture))),
        },
        passed: Boolean(attempt.overallScore >= passThreshold),
        status: attempt.status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Record question hashes in user_question_history
      for (const q of attempt.questions.slice(0, 30)) {
        const histId = sanitizeId(`qh_${uid}_${q.hash}`);
        await setDoc(doc(db, 'user_question_history', histId), {
          id: histId,
          userId: uid,
          questionHash: q.hash.slice(0, 128),
          topic: String(q.topic).slice(0, 64),
          askedAt: serverTimestamp(),
        });
      }

      // Upsert user_interview_status enforcing high-water Completed rule
      const topicKey = `${attempt.track}-${attempt.seniority}-${[...attempt.selectedTopics].sort().join('-')}`.slice(0, 200);
      const statusId = sanitizeId(`st_${uid}_${topicKey}`);
      const statusPath = `user_interview_status/${statusId}`;
      const statusRef = doc(db, 'user_interview_status', statusId);
      const existingSnap = await getDoc(statusRef);
      const passedNow = attempt.overallScore >= passThreshold;

      if (!existingSnap.exists()) {
        await setDoc(statusRef, {
          id: statusId,
          userId: uid,
          candidateName: attempt.candidateName.slice(0, 120),
          topicSetKey: topicKey,
          status: passedNow ? 'Completed' : 'In Progress',
          bestScore: attempt.overallScore,
          latestScore: attempt.overallScore,
          attemptCount: 1,
          ...(passedNow ? { completedAt: new Date().toISOString() } : {}),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        const prev = existingSnap.data();
        const prevCompleted = prev.status === 'Completed';
        const nextStatus = prevCompleted || passedNow ? 'Completed' : 'In Progress';
        const nextBest = Math.max(Number(prev.bestScore || 0), attempt.overallScore);
        const nextCount = Number(prev.attemptCount || 0) + 1;

        const updatePayload: Record<string, unknown> = {
          candidateName: attempt.candidateName.slice(0, 120),
          status: nextStatus,
          bestScore: nextBest,
          latestScore: attempt.overallScore,
          attemptCount: nextCount,
          updatedAt: serverTimestamp(),
        };
        if (!prevCompleted && passedNow) {
          updatePayload.completedAt = new Date().toISOString();
        }
        await updateDoc(statusRef, updatePayload);
      }
      void statusPath;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, attemptPath);
    }
  }

  async getUserQuestionHistory(userId: string): Promise<string[]> {
    if (!auth.currentUser) return [];
    const uid = sanitizeId(userId);
    const path = 'user_question_history';
    try {
      const q = query(collection(db, path), where('userId', '==', uid), limit(250));
      const snap = await getDocs(q);
      return snap.docs.map(d => String(d.data().questionHash));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  async getInterviewSettings(): Promise<InterviewSettings | null> {
    if (!auth.currentUser) return null;
    const path = 'interview_settings/global';
    try {
      const snap = await getDoc(doc(db, 'interview_settings', 'global'));
      if (!snap.exists()) return null;
      const d = snap.data();
      return {
        passThreshold: Number(d.passThreshold ?? 80),
        weights: d.weights,
        defaultQuestionsPerSession: Number(d.defaultQuestionsPerSession ?? 10),
        defaultTimePerAnswerSec: Number(d.defaultTimePerAnswerSec ?? 120),
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  }

  async saveInterviewSettings(settings: InterviewSettings): Promise<void> {
    if (!auth.currentUser) return;
    const path = 'interview_settings/global';
    try {
      await setDoc(doc(db, 'interview_settings', 'global'), {
        passThreshold: settings.passThreshold,
        weights: settings.weights,
        defaultQuestionsPerSession: settings.defaultQuestionsPerSession,
        defaultTimePerAnswerSec: settings.defaultTimePerAnswerSec,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  async getMyAttempts(userId: string): Promise<InterviewAttempt[]> {
    if (!auth.currentUser) return [];
    const uid = sanitizeId(userId);
    const path = 'interview_attempts';
    try {
      const q = query(collection(db, path), where('userId', '==', uid), limit(50));
      const snap = await getDocs(q);
      return snap.docs
        .map(d => d.data() as InterviewAttempt)
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  async upsertProctoredFeed(feed: ProctoredLiveFeed): Promise<void> {
    if (!auth.currentUser) return;
    const sessionId = sanitizeId(feed.sessionId);
    const path = `proctored_feeds/${sessionId}`;
    try {
      await setDoc(doc(db, 'proctored_feeds', sessionId), {
        sessionId,
        studentId: sanitizeId(auth.currentUser.uid),
        studentName: feed.studentName.slice(0, 120),
        track: feed.track.slice(0, 120),
        difficulty: feed.difficulty.slice(0, 40),
        startedAt: feed.startedAt.slice(0, 64),
        currentQuestionIndex: feed.currentQuestionIndex,
        totalQuestions: feed.totalQuestions,
        currentQuestion: feed.currentQuestion.slice(0, 1000),
        currentTranscript: feed.currentTranscript.slice(0, 4000),
        ...(feed.videoFrameDataUrl ? { videoFrameDataUrl: feed.videoFrameDataUrl.slice(0, 200000) } : {}),
        isCameraActive: feed.isCameraActive,
        isAudioActive: feed.isAudioActive,
        status: feed.status,
        lastHeartbeat: feed.lastHeartbeat.slice(0, 64),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  async deleteProctoredFeed(sessionId: string): Promise<void> {
    if (!auth.currentUser) return;
    const id = sanitizeId(sessionId);
    const path = `proctored_feeds/${id}`;
    try {
      await deleteDoc(doc(db, 'proctored_feeds', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  subscribeAdminData(callbacks: {
    onRequests: (reqs: (AccessRequest & { userId?: string })[]) => void;
    onLogs: (logs: UserActivityLog[]) => void;
    onAttempts: (attempts: InterviewAttempt[]) => void;
    onStatuses: (statuses: (UserInterviewStatus & { candidateName?: string; updatedAt?: string })[]) => void;
    onFeeds: (feeds: ProctoredLiveFeed[]) => void;
  }): () => void {
    if (!auth.currentUser) return () => {};

    const unsubs: (() => void)[] = [];

    unsubs.push(
      onSnapshot(
        query(collection(db, 'access_requests'), orderBy('createdAt', 'desc'), limit(50)),
        snap => {
          callbacks.onRequests(
            snap.docs.map(d => {
              const data = d.data();
              return {
                id: data.id,
                userId: data.userId,
                fullName: data.fullName,
                email: data.email,
                targetRole: data.targetRole,
                reason: data.reason,
                status: data.status,
                createdAt: toIsoString(data.createdAt),
                approvedAt: data.approvedAt,
                approvedBy: data.approvedBy,
              };
            })
          );
        },
        err => handleFirestoreError(err, OperationType.LIST, 'access_requests')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'user_activity_logs'), orderBy('createdAt', 'desc'), limit(50)),
        snap => {
          callbacks.onLogs(
            snap.docs.map(d => {
              const data = d.data();
              return {
                id: data.id,
                userId: data.userId,
                userEmail: data.userEmail,
                userName: data.userName,
                action: data.action,
                description: data.description,
                timestamp: toIsoString(data.createdAt),
              };
            })
          );
        },
        err => handleFirestoreError(err, OperationType.LIST, 'user_activity_logs')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'interview_attempts'), orderBy('createdAt', 'desc'), limit(100)),
        snap => {
          callbacks.onAttempts(snap.docs.map(d => d.data() as InterviewAttempt));
        },
        err => handleFirestoreError(err, OperationType.LIST, 'interview_attempts')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'user_interview_status'), limit(100)),
        snap => {
          callbacks.onStatuses(
            snap.docs.map(d => {
              const data = d.data();
              return {
                userId: data.userId,
                candidateName: data.candidateName,
                topicSetKey: data.topicSetKey,
                status: data.status,
                bestScore: Number(data.bestScore || 0),
                latestScore: Number(data.latestScore || 0),
                attemptCount: Number(data.attemptCount || 0),
                completedAt: data.completedAt,
                updatedAt: toIsoString(data.updatedAt),
              };
            })
          );
        },
        err => handleFirestoreError(err, OperationType.LIST, 'user_interview_status')
      )
    );

    unsubs.push(
      onSnapshot(
        query(collection(db, 'proctored_feeds'), limit(25)),
        snap => {
          callbacks.onFeeds(snap.docs.map(d => d.data() as ProctoredLiveFeed));
        },
        err => handleFirestoreError(err, OperationType.LIST, 'proctored_feeds')
      )
    );

    return () => {
      unsubs.forEach(u => u());
    };
  }
}

export const firestoreService = new FirestoreService();

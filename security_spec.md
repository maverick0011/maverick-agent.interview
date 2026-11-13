# Firestore Security Specification

## 1. Data Invariants
1. **Identity Integrity**: Every user-owned document (`users/{userId}`, `access_requests/{requestId}`, `user_activity_logs/{logId}`, `interview_attempts/{attemptId}`, `user_question_history/{historyId}`, `user_interview_status/{statusId}`, `proctored_feeds/{sessionId}`) must bind its `uid` / `userId` / `studentId` strictly to `request.auth.uid` on create and keep it immutable on update.
2. **Email Verification**: All authenticated write operations require `request.auth.token.email_verified == true`.
3. **PII Isolation**: `users/{userId}` and `access_requests/{requestId}` contain emails and names and are readable only by the owning user or an authenticated admin (`isAdmin()`). No blanket `isSignedIn()` reads on PII collections.
4. **Privilege Escalation Prevention**: Regular users cannot create a `users/{userId}` document with `role == 'admin'` or `isApproved == true` unless their verified email is in the bootstrapped admin list, nor can they update `role` or `isApproved` on their own profile.
5. **High-Water Completion Invariant**: Once a `user_interview_status` document reaches `status == 'Completed'`, a candidate cannot downgrade `status` back to `'In Progress'` or reduce `bestScore` or `attemptCount`.
6. **Terminal State Locking**: Once an `interview_attempts` document has `status == 'completed'`, candidates cannot mutate its scores or answers (only admins have override access).
7. **Temporal Integrity**: `createdAt`, `updatedAt`, and `askedAt` must match `request.time` on creation/update and `createdAt` must remain immutable.
8. **Query Enforcement**: Every `allow list` rule on user-scoped collections explicitly evaluates `resource.data.userId == request.auth.uid` (or `studentId == request.auth.uid`) or `isAdmin()`.

## 2. Dirty Dozen Attack Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Read on PII**: Unauthenticated `getDoc(/users/user-1)`.
2. **Cross-User PII Read**: Authenticated student A reading `/users/student-B`.
3. **Self-Admin Escalation on Create**: Student creating `/users/{myUid}` with `{ role: 'admin', isApproved: true }`.
4. **Self-Approval Escalation on Update**: Student updating `/users/{myUid}` with `{ isApproved: true }`.
5. **Shadow Field Injection**: Creating `/interview_attempts/{id}` with extra undocumented field `{ shadowFlag: true }`.
6. **Spoofed User ID on Attempt**: Student A creating `/interview_attempts/{id}` with `{ userId: 'student-B' }`.
7. **Client-Forged Timestamp**: Creating `/user_activity_logs/{id}` with `createdAt` set to a past ISO string instead of `serverTimestamp()`.
8. **Mutating Completed Attempt**: Student updating `/interview_attempts/{id}` after `status` is `'completed'` to inflate `overallScore`.
9. **Revoking Completed Status**: Student updating `/user_interview_status/{id}` from `status: 'Completed'` back to `'In Progress'` or lowering `bestScore`.
10. **Non-Admin Settings Tampering**: Student updating `/interview_settings/global` to lower `passThreshold` to `10`.
11. **Unverified Email Spoofing**: Token with admin email string but `email_verified: false` attempting admin list on `/users`.
12. **ID Poisoning / Resource Exhaustion**: Writing `/user_question_history/{2000-char-junk-id}` or oversized >1000 char `topic` string.

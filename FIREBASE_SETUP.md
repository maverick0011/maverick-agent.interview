# Firebase authentication setup

The frontend now requires Firebase Google Authentication. There is no guest account or local role picker.

## 1. Create/configure Firebase

1. Create a Firebase project and register a Web app.
2. In **Authentication → Sign-in method**, enable **Google**.
3. In **Authentication → Settings → Authorized domains**, add `interview.cloudnativeacademy.in`.
4. Create a **Cloud Firestore** database.
5. In Firestore → Rules, publish the contents of `firestore.rules` from this repository.

## 2. Configure the GitHub Pages build

In GitHub → repository **Settings → Secrets and variables → Actions → Variables**, add:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

Use the values from Firebase Project settings → General → Your apps → SDK setup and configuration. These are Firebase web-app configuration values, not service-account private keys. Never add a service-account JSON/private key to the frontend.

Re-run the GitHub Actions workflow or push a new commit to deploy with the configuration.

## 3. Access model

- Google identity must be authenticated and email-verified.
- `mavbharath01@gmail.com` is the only administrator; the role is derived from the verified Firebase Auth token email.
- Other users are created as `candidate/pending` and cannot enter the application until an administrator changes their Firestore `users/{uid}.status` to `approved`.
- Firestore rules prevent candidates from changing their own role or approval status.

To approve a candidate, sign in as the administrator and update that user's Firestore document: set `status` to `approved` while keeping `role` as `candidate`.

## Notes

The existing interview workspace data is still stored in browser local storage. This change secures sign-in and the candidate/admin entry gate; it does not migrate interview records or live video feeds into a shared backend.

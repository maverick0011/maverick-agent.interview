import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { FirebaseAuthBoundary } from './components/auth/FirebaseAuthBoundary';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <FirebaseAuthBoundary><App /></FirebaseAuthBoundary>
);

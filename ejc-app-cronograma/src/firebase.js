import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// ⚠️ IMPORTANTE: Substitua com suas credenciais do Firebase
// 1. Vá para: https://console.firebase.google.com/
// 2. Crie um novo projeto chamado "ejc-app"
// 3. Copie as credenciais abaixo

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'your-project.firebaseapp.com',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'your-project',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'your-project.appspot.com',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || 'your-sender-id',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || 'your-app-id'
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

export default app;

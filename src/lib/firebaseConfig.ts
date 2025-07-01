import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDrJi7stA6NdrFMomVs2CHE-Ki_FMdcz0Y',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: 'duelverse-remote',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

// Este bloco garante que o Firebase seja inicializado APENAS no navegador.
// No ambiente do servidor (SSR), este código não será executado, evitando o erro.
if (typeof window !== 'undefined') {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  auth = getAuth(app);
  firestore = getFirestore(app);
}

// Ignoramos o erro de TypeScript aqui porque no servidor essas variáveis
// estarão indefinidas, mas elas só são usadas no cliente, onde são garantidas.
// @ts-ignore
export { app, auth, firestore };
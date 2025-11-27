import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBQrklMvI5i7sMMoaHC56WLl8el5yh1sEc",
  authDomain: "fr-tournament-81a91.firebaseapp.com",
  databaseURL: "https://fr-tournament-81a91-default-rtdb.firebaseio.com",
  projectId: "fr-tournament-81a91",
  storageBucket: "fr-tournament-81a91.firebasestorage.app",
  messagingSenderId: "649819664719",
  appId: "1:649819664719:web:24c97c3b32136c877e153a",
  measurementId: "G-80YVJVB5Q4"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

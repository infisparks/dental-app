import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBaTeRtmiV1lGgptTK_TMwB-6lD04vkg3w",
  authDomain: "dental-clinic-4f741.firebaseapp.com",
  databaseURL: "https://dental-clinic-4f741-default-rtdb.firebaseio.com",
  projectId: "dental-clinic-4f741",
  storageBucket: "dental-clinic-4f741.firebasestorage.app",
  messagingSenderId: "56058745204",
  appId: "1:56058745204:web:b58eee5e8e9ad136f95c21",
  measurementId: "G-G6VSRL30Q9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);

let analytics: any = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}
export { analytics };
import { initializeApp } from "firebase/app"
import { getDatabase, ref, push, set, get, onValue, off, remove } from "firebase/database"
import { getAuth } from "firebase/auth"
import { getAnalytics } from "firebase/analytics"

// NOTE: Using the provided configuration
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
export const auth = getAuth(app); // EXPORTED AUTH
// export const analytics = getAnalytics(app); // Example if you need analytics
export const database = getDatabase(app);

// Re-export database utilities for easier access
export { ref, push, set, get, onValue, off, remove };

// --- INTERFACE DEFINITIONS (Moved here for shared access) ---
export interface ServiceItem {
    name: string
    charge: number
}

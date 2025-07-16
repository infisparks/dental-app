'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ref, get, child } from 'firebase/database';
import { auth, database } from '@/lib/firebase';

interface UserContextType {
  user: User | null;
  role: 'admin' | 'staff' | null;
  loading: boolean;
}

const UserContext = createContext<UserContextType>({
  user: null,
  role: null,
  loading: true,
});

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'staff' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Fetch user role from Realtime Database
        try {
          const dbRef = ref(database);
          const snapshot = await get(child(dbRef, `user/${firebaseUser.uid}/type`));
          if (snapshot.exists()) {
            setRole(snapshot.val());
          } else {
            setRole(null);
          }
        } catch (error) {
          setRole(null);
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, role, loading }}>
      {children}
    </UserContext.Provider>
  );
}; 
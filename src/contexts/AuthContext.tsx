
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo
} from 'firebase/auth';
import { addNotification, type UserProfile } from '@/lib/data-service'; // UserProfile might be needed later
import { doc, getDoc, setDoc } from 'firebase/firestore';


interface AuthContextType {
  user: FirebaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  updateUserProfileName: (newName: string) => Promise<void>;
  logout: () => Promise<void>;
  currentCompanyId: string | null;
  setCurrentCompanyId: (companyId: string | null) => void; // Expose setter if needed by other parts
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentCompanyIdState, setCurrentCompanyIdState] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    console.log("AuthContext: Initializing onAuthStateChanged listener.");
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("AuthContext: onAuthStateChanged triggered. Firebase user:", firebaseUser ? firebaseUser.uid : null);
      setUser(firebaseUser);
      if (firebaseUser) {
        const storedCompanyId = localStorage.getItem('financeFlowCurrentCompanyId');
        if (storedCompanyId) {
          console.log(`AuthContext: User authenticated (${firebaseUser.uid}). Found companyId in localStorage: '${storedCompanyId}'. Setting it in context.`);
          setCurrentCompanyIdState(storedCompanyId);
        } else {
          console.warn(`AuthContext: User authenticated (${firebaseUser.uid}) but no companyId found in localStorage. Current path: ${pathname}`);
          setCurrentCompanyIdState(null);
          if (pathname !== "/") { // If authenticated but no companyId, and not on company select page
            console.log("AuthContext: Redirecting to / for company ID entry.");
            router.push('/');
          }
        }
      } else {
        // User is signed out
        console.log("AuthContext: User signed out. Clearing companyId from localStorage and context state.");
        localStorage.removeItem('financeFlowCurrentCompanyId');
        setCurrentCompanyIdState(null);
      }
      setIsLoading(false);
      console.log("AuthContext: setIsLoading(false). User:", firebaseUser ? firebaseUser.uid : null, "CompanyId:", currentCompanyIdState);
    });
    return () => {
      console.log("AuthContext: Cleaning up onAuthStateChanged listener.");
      unsubscribe();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Pathname dependency removed to avoid re-subscribing excessively. Relies on initial setup.

  const isAuthenticated = !!user;

  useEffect(() => {
    console.log(`AuthContext: isLoading=${isLoading}, isAuthenticated=${isAuthenticated}, currentCompanyIdState=${currentCompanyIdState}, pathname=${pathname}`);
    if (!isLoading) {
      if (!isAuthenticated && pathname !== '/') {
        console.log("AuthContext: Not authenticated and not on company login page. Redirecting to /.");
        router.push('/');
      } else if (isAuthenticated && !currentCompanyIdState && pathname !== '/') {
        console.log("AuthContext: Authenticated but no currentCompanyId and not on company login page. Redirecting to /.");
        router.push('/');
      } else if (isAuthenticated && currentCompanyIdState && pathname === '/') {
        console.log("AuthContext: Authenticated with companyId and on company login page. Redirecting to /dashboard.");
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, router, pathname, currentCompanyIdState]);


  const signInWithGoogle = async () => {
    setIsLoading(true);
    console.log("AuthContext: Attempting Google Sign-In...");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      const additionalUserInfo = getAdditionalUserInfo(result);
      console.log("AuthContext: Google Sign-In successful. User UID:", firebaseUser.uid);

      if (firebaseUser) {
        // Check for companyId immediately after login, as it's set by the page.tsx before calling this
        const companyIdFromStorage = localStorage.getItem('financeFlowCurrentCompanyId');
        if (companyIdFromStorage) {
          console.log(`AuthContext (signInWithGoogle): Company ID from localStorage: '${companyIdFromStorage}'. Setting in context.`);
          setCurrentCompanyIdState(companyIdFromStorage);
        } else {
          console.warn(`AuthContext (signInWithGoogle): No Company ID found in localStorage immediately after sign-in. This might indicate an issue or require re-entry.`);
          // Don't push to '/' here, let the main useEffect handle it if needed.
        }

        if (additionalUserInfo?.isNewUser) {
          console.log("AuthContext: New user signed up via Google:", firebaseUser.displayName, firebaseUser.uid);
          await addNotification(
            `User ${firebaseUser.displayName || 'New User'} (...${firebaseUser.uid.slice(-6)}) joined KENESIS via Google.`,
            'user_joined',
            firebaseUser.uid,
            undefined, // No relatedId for user_joined
            companyIdFromStorage || "UNKNOWN_COMPANY" // Pass companyId if available
          );
          // Optionally create a user profile document in Firestore
          // Example: await setDoc(doc(db, "users", firebaseUser.uid), { email: firebaseUser.email, displayName: firebaseUser.displayName, joinedAt: serverTimestamp(), companyAffiliations: companyIdFromStorage ? [companyIdFromStorage] : [] });
        }
      }
      // onAuthStateChanged will also fire and set the user, which will trigger the main redirection useEffect.
      // No explicit redirect here to avoid race conditions with onAuthStateChanged.
    } catch (error: any) {
      setIsLoading(false);
      console.error("AuthContext: Google Sign-In error:", error.code, error.message);
      throw error;
    }
    // setIsLoading(false) is handled by onAuthStateChanged
  };

  const updateUserProfileName = async (newName: string) => {
    if (!auth.currentUser) {
      console.error("AuthContext: No user currently signed in to update profile.");
      throw new Error("No user currently signed in to update profile.");
    }
    setIsLoading(true);
    console.log(`AuthContext: Attempting to update profile name for user ${auth.currentUser.uid} to '${newName}'`);
    try {
      await updateProfile(auth.currentUser, { displayName: newName });
      setUser(prevUser => prevUser ? { ...prevUser, displayName: newName } : null); // Optimistic update
      console.log("AuthContext: Profile name updated successfully.");
      setIsLoading(false);
    } catch (error: any) {
      setIsLoading(false);
      console.error("AuthContext: Error updating user profile name:", error);
      throw error;
    }
  };

  const logout = async () => {
    console.log("AuthContext: Attempting to log out...");
    setIsLoading(true);
    try {
      await firebaseSignOut(auth);
      console.log("AuthContext: User signed out from Firebase. Clearing companyId from localStorage and context state.");
      localStorage.removeItem('financeFlowCurrentCompanyId');
      setCurrentCompanyIdState(null);
      setUser(null); // Explicitly set user to null
      router.push('/');
      console.log("AuthContext: Redirected to / after logout.");
    } catch (error) {
      setIsLoading(false);
      console.error("AuthContext: Firebase logout error:", error);
      throw error;
    }
    // setIsLoading(false) is set within onAuthStateChanged usually, but explicitly here too.
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, signInWithGoogle, updateUserProfileName, logout, currentCompanyId: currentCompanyIdState, setCurrentCompanyId: setCurrentCompanyIdState }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

    
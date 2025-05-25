
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth, db } from '@/lib/firebase'; // Ensure db is imported if needed elsewhere, not directly used here
import type { User as FirebaseUser } from 'firebase/auth';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo,
} from 'firebase/auth';
import { addNotification } from '@/lib/data-service'; // UserProfile might be needed later
// import { doc, getDoc, setDoc } from 'firebase/firestore'; // Not used currently in this file

interface AuthContextType {
  user: FirebaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  updateUserProfileName: (newName: string) => Promise<void>;
  logout: () => Promise<void>;
  currentCompanyId: string | null;
  setCurrentCompanyId: (companyId: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start as true
  const [currentCompanyIdState, setCurrentCompanyIdState] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    console.log("AuthContext: Initializing onAuthStateChanged listener.");
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("AuthContext: onAuthStateChanged triggered. Firebase user:", firebaseUser ? firebaseUser.uid : null);
      let companyIdToSet: string | null = null;

      if (firebaseUser) {
        setUser(firebaseUser); // Set user first
        const storedCompanyId = localStorage.getItem('financeFlowCurrentCompanyId');
        if (storedCompanyId) {
          console.log(`AuthContext: User authenticated (${firebaseUser.uid}). Found companyId in localStorage: '${storedCompanyId}'. Path: ${pathname}`);
          companyIdToSet = storedCompanyId;
        } else {
          console.warn(`AuthContext: User authenticated (${firebaseUser.uid}) but no companyId found in localStorage. Path: ${pathname}`);
        }
      } else {
        setUser(null);
        // User is signed out
        console.log("AuthContext: User signed out. Clearing companyId from localStorage.");
        localStorage.removeItem('financeFlowCurrentCompanyId');
      }
      setCurrentCompanyIdState(companyIdToSet); // Set company ID (or null)
      setIsLoading(false); // Set loading to false AFTER user and companyId are processed
      console.log("AuthContext: Initial load complete. User:", firebaseUser ? firebaseUser.uid : null, "CompanyId:", companyIdToSet, "Path:", pathname);
    });
    return () => {
      console.log("AuthContext: Cleaning up onAuthStateChanged listener.");
      unsubscribe();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount to set up listener, pathname removed as dependency here to avoid re-subscribing excessively

  const isAuthenticated = !!user;

  // Centralized redirection logic
  useEffect(() => {
    console.log(`AuthContext: Redirection check. isLoading=${isLoading}, isAuthenticated=${isAuthenticated}, currentCompanyId=${currentCompanyIdState}, pathname=${pathname}`);
    if (isLoading) { // If AuthContext is still determining initial state, don't redirect yet.
      return;
    }

    if (!isAuthenticated) {
      // Not authenticated
      if (pathname !== '/') { // Avoid redirect loop if already on company login page
        console.log("AuthContext: Not authenticated. Redirecting to /.");
        router.push('/');
      }
    } else {
      // Is Authenticated
      if (!currentCompanyIdState) {
        // Authenticated, but no company ID selected/stored
        if (pathname !== '/') { // Avoid redirect loop if already on company login page
          console.log("AuthContext: Authenticated but no currentCompanyId. Redirecting to / to select company.");
          router.push('/');
        }
      } else {
        // Authenticated AND has company ID
        if (pathname === '/') { // If on the company login page, redirect to dashboard
          console.log("AuthContext: Authenticated with companyId and on /. Redirecting to /dashboard.");
          router.push('/dashboard');
        }
      }
    }
  }, [isAuthenticated, isLoading, currentCompanyIdState, pathname, router]);


  const signInWithGoogle = async () => {
    setIsLoading(true); // Indicate loading starts for the sign-in process
    console.log("AuthContext: Attempting Google Sign-In...");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      const additionalUserInfo = getAdditionalUserInfo(result);
      console.log("AuthContext: Google Sign-In successful. User UID:", firebaseUser.uid);

      if (firebaseUser) {
        const companyIdFromStorage = localStorage.getItem('financeFlowCurrentCompanyId'); // Should be set by page.tsx
        if (companyIdFromStorage) {
          console.log(`AuthContext (signInWithGoogle): Company ID from localStorage: '${companyIdFromStorage}'. Setting in context state.`);
          setCurrentCompanyIdState(companyIdFromStorage); // Update context state
        } else {
          console.warn(`AuthContext (signInWithGoogle): No Company ID found in localStorage immediately after sign-in. This might indicate an issue.`);
        }

        if (additionalUserInfo?.isNewUser) {
          console.log("AuthContext: New user signed up via Google:", firebaseUser.displayName, firebaseUser.uid);
          await addNotification(
            `User ${firebaseUser.displayName || 'New User'} (...${firebaseUser.uid.slice(-6)}) joined via Google.`,
            'user_joined',
            firebaseUser.uid,
            undefined,
            companyIdFromStorage || "UNKNOWN_COMPANY"
          );
        }
      }
      // onAuthStateChanged will also fire and set user/companyId, and isLoading to false.
      // The redirection useEffect will then handle navigation.
    } catch (error: any) {
      setIsLoading(false); // Ensure loading stops on error
      console.error("AuthContext: Google Sign-In error:", error.code, error.message);
      // Propagate the error so the form can display it
      throw error;
    }
  };

  const updateUserProfileName = async (newName: string) => {
    if (!auth.currentUser) {
      console.error("AuthContext: No user currently signed in to update profile.");
      throw new Error("No user currently signed in to update profile.");
    }
    // No need to set isLoading for this, it's a quick operation generally
    console.log(`AuthContext: Attempting to update profile name for user ${auth.currentUser.uid} to '${newName}'`);
    try {
      await updateProfile(auth.currentUser, { displayName: newName });
      setUser(prevUser => prevUser ? { ...prevUser, displayName: newName } : null);
      console.log("AuthContext: Profile name updated successfully.");
    } catch (error: any) {
      console.error("AuthContext: Error updating user profile name:", error);
      throw error;
    }
  };

  const logout = async () => {
    console.log("AuthContext: Attempting to log out...");
    setIsLoading(true); // Indicate loading for logout process
    try {
      await firebaseSignOut(auth);
      console.log("AuthContext: User signed out from Firebase. Clearing companyId from localStorage and context state.");
      localStorage.removeItem('financeFlowCurrentCompanyId');
      setCurrentCompanyIdState(null); // Clear companyId in context
      setUser(null); // Explicitly set user to null
      // The onAuthStateChanged listener will also fire, setting isLoading to false.
      // The redirection useEffect will then push to '/'.
    } catch (error) {
      setIsLoading(false); // Ensure loading stops on error
      console.error("AuthContext: Firebase logout error:", error);
      throw error;
    }
  };

  const handleSetCurrentCompanyId = (companyId: string | null) => {
    if (companyId) {
      localStorage.setItem('financeFlowCurrentCompanyId', companyId);
    } else {
      localStorage.removeItem('financeFlowCurrentCompanyId');
    }
    setCurrentCompanyIdState(companyId);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, signInWithGoogle, updateUserProfileName, logout, currentCompanyId: currentCompanyIdState, setCurrentCompanyId: handleSetCurrentCompanyId }}>
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

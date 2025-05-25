
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo
} from 'firebase/auth';
import { addNotification } from '@/lib/data-service';

const COMPANY_ID_LOCAL_STORAGE_KEY = "financeFlowCurrentCompanyId";

interface AuthContextType {
  user: FirebaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  currentCompanyId: string | null; // Added
  setCurrentCompanyId: (companyId: string | null) => void; // Added
  signInWithGoogle: () => Promise<void>;
  updateUserProfileName: (newName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentCompanyId, setCurrentCompanyIdState] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedCompanyId = localStorage.getItem(COMPANY_ID_LOCAL_STORAGE_KEY);
    if (storedCompanyId) {
      setCurrentCompanyIdState(storedCompanyId);
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // User is signed in, try to load companyId from localStorage if not already set.
        // This ensures it's loaded on initial app load if user was already logged in.
        const companyIdFromStorage = localStorage.getItem(COMPANY_ID_LOCAL_STORAGE_KEY);
        if (companyIdFromStorage) {
          setCurrentCompanyIdState(companyIdFromStorage);
        } else {
          // If authenticated but no company ID, they should be on '/' to enter one.
          // This case is handled by the redirection effect below.
        }
      } else {
        // User is signed out, clear companyId.
        setCurrentCompanyIdState(null);
        localStorage.removeItem(COMPANY_ID_LOCAL_STORAGE_KEY);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const isAuthenticated = !!user;

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && pathname !== '/') {
        router.push('/'); // Not authenticated, go to company ID/login page
      } else if (isAuthenticated && !currentCompanyId && pathname !== '/') {
        // Authenticated but no company ID (e.g., localStorage was cleared, or new login without it being set yet)
        // and not already on the page to set it.
        router.push('/');
      } else if (isAuthenticated && currentCompanyId && pathname === '/') {
        // Authenticated, has company ID, but somehow on the login page
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, currentCompanyId, router, pathname]);


  const signInWithGoogle = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const additionalUserInfo = getAdditionalUserInfo(result);
      
      if (result.user) {
         // After successful Google sign-in, ensure currentCompanyId is set from localStorage
        const companyIdFromStorage = localStorage.getItem(COMPANY_ID_LOCAL_STORAGE_KEY);
        if (companyIdFromStorage) {
          setCurrentCompanyIdState(companyIdFromStorage);
        } else {
          // This is a problem: logged in but no company ID. User should be forced to /
          // The effect above should handle this redirect.
          console.warn("Signed in with Google, but no Company ID found in localStorage.");
        }

        if (additionalUserInfo?.isNewUser) {
          await updateProfile(result.user, {
            displayName: result.user.displayName || 'New User', // Use Google's name
            photoURL: result.user.photoURL,
          });
          setUser(auth.currentUser); // Update local state

          // For new user joining, companyId is crucial for notification
          if (companyIdFromStorage) {
            await addNotification(
              `User ${result.user.displayName || 'New User'} (...${result.user.uid.slice(-6)}) joined company ${companyIdFromStorage}.`,
              'user_joined',
              companyIdFromStorage, // Pass companyId here
              result.user.uid
            );
          }
        }
      }
      // onAuthStateChanged will also trigger and the effect will ensure proper state/redirect.
    } catch (error: any) {
      setIsLoading(false);
      console.error("Google Sign-In error:", error);
      throw error;
    } finally {
      // setIsLoading(false); // Let onAuthStateChanged handle final loading state
    }
  };
  
  const setCurrentCompanyId = (companyId: string | null) => {
    if (companyId) {
      localStorage.setItem(COMPANY_ID_LOCAL_STORAGE_KEY, companyId);
    } else {
      localStorage.removeItem(COMPANY_ID_LOCAL_STORAGE_KEY);
    }
    setCurrentCompanyIdState(companyId);
  };


  const updateUserProfileName = async (newName: string) => {
    if (!auth.currentUser) {
      throw new Error("No user currently signed in to update profile.");
    }
    setIsLoading(true);
    try {
      await updateProfile(auth.currentUser, { displayName: newName });
      setUser(auth.currentUser ? { ...auth.currentUser } : null); // Trigger re-render with updated user
      setIsLoading(false);
    } catch (error: any) {
      setIsLoading(false);
      console.error("Error updating user profile name:", error);
      throw error;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await firebaseSignOut(auth);
      setCurrentCompanyId(null); // Clear companyId from context and localStorage
      // onAuthStateChanged will set user to null. The effect will redirect to '/'.
    } catch (error) {
      console.error("Firebase logout error:", error);
      setIsLoading(false);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoading, 
      currentCompanyId, 
      setCurrentCompanyId, 
      signInWithGoogle, 
      updateUserProfileName, 
      logout 
    }}>
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

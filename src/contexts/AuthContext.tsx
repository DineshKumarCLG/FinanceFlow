
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
  getAdditionalUserInfo,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { addNotification, getCompany } from '@/lib/data-service';

const COMPANY_ID_LOCAL_STORAGE_KEY = "financeFlowCurrentCompanyId";

interface AuthContextType {
  user: FirebaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  currentCompanyId: string | null;
  setCurrentCompanyId: (companyId: string | null) => void;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
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
        const companyIdFromStorage = localStorage.getItem(COMPANY_ID_LOCAL_STORAGE_KEY);
        if (companyIdFromStorage) {
          // Ensure companyId is set in context if user is already logged in and companyId exists in storage
          setCurrentCompanyIdState(companyIdFromStorage);
        }
      } else {
        setCurrentCompanyIdState(null); // Clear companyId on logout
        // No need to remove from localStorage here, setCurrentCompanyId handles it
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const isAuthenticated = !!user;

  useEffect(() => {
    const handleNavigation = async () => {
      if (!isLoading) {
        if (!isAuthenticated && pathname !== '/') {
          router.push('/');
        } else if (isAuthenticated && !currentCompanyId && pathname !== '/onboarding') {
          router.push('/onboarding');
        } else if (isAuthenticated && currentCompanyId && (pathname === '/' || pathname === '/onboarding')) {
          // Verify company exists in Firebase before navigating to dashboard
          try {
            const company = await getCompany(currentCompanyId);
            if (company) {
              router.push('/dashboard');
            } else {
              // Company doesn't exist, clear it and go to onboarding
              setCurrentCompanyId(null);
              router.push('/onboarding');
            }
          } catch (error) {
            console.error('Error checking company existence:', error);
            // On error, go to onboarding to be safe
            setCurrentCompanyId(null);
            router.push('/onboarding');
          }
        }
      }
    };

    handleNavigation();
  }, [isAuthenticated, isLoading, currentCompanyId, router, pathname]);


  const signInWithGoogle = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const additionalUserInfo = getAdditionalUserInfo(result);
      
      if (result.user) {
        // Proactively set companyId from localStorage immediately after successful sign-in
        const companyIdFromStorage = localStorage.getItem(COMPANY_ID_LOCAL_STORAGE_KEY);
        if (companyIdFromStorage) {
          setCurrentCompanyIdState(companyIdFromStorage); // Update context state directly
        } else {
          console.warn("Signed in with Google, but no Company ID found in localStorage. User will be redirected to / to enter it.");
          // The effect above will handle redirecting to / if currentCompanyId remains null
        }

        if (additionalUserInfo?.isNewUser) {
          await updateProfile(result.user, {
            displayName: result.user.displayName || 'New User', // Use Google's name
            photoURL: result.user.photoURL,
          });
          setUser(auth.currentUser ? { ...auth.currentUser } : null); // Update local state for immediate reflection if needed

          if (companyIdFromStorage) { // Only add notification if companyId is known
            await addNotification(
              `User ${result.user.displayName || 'New User'} (...${result.user.uid.slice(-6)}) joined company ${companyIdFromStorage}.`,
              'user_joined',
              companyIdFromStorage,
              result.user.uid
            );
          }
        }
      }
      // onAuthStateChanged will also trigger, and the main useEffect will handle redirection to dashboard if companyId is set
    } catch (error: any) {
      console.error("Google Sign-In error:", error);
      setIsLoading(false);
      throw error; 
    }
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    setIsLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      if (result.user) {
        await updateProfile(result.user, {
          displayName: fullName,
        });
        setUser(auth.currentUser ? { ...auth.currentUser } : null);
      }
    } catch (error: any) {
      console.error("Email Sign-Up error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error("Email Sign-In error:", error);
      throw error;
    } finally {
      setIsLoading(false);
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
      setUser(auth.currentUser ? { ...auth.currentUser } : null);
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
      setCurrentCompanyId(null); // This will also remove from localStorage
      // onAuthStateChanged will set user to null and setIsLoading(false).
      // The effect will redirect to '/'.
    } catch (error) {
      console.error("Firebase logout error:", error);
      setIsLoading(false); // Ensure loading is false on error
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
      signUpWithEmail,
      signInWithEmail,
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

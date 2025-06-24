
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
  checkCompanyExists: (companyId: string) => Promise<boolean>;
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
        console.log('AuthContext navigation check:', { isAuthenticated, currentCompanyId, pathname });
        
        if (!isAuthenticated && pathname !== '/') {
          console.log('Redirecting to login page');
          router.push('/');
        } else if (isAuthenticated && !currentCompanyId && pathname !== '/onboarding') {
          console.log('Redirecting to onboarding (no company ID)');
          router.push('/onboarding');
        } else if (isAuthenticated && currentCompanyId && pathname === '/') {
          // Only check company existence when redirecting from root, not onboarding
          try {
            console.log('Checking if company exists:', currentCompanyId);
            const company = await getCompany(currentCompanyId);
            if (company) {
              console.log('Company exists, redirecting to dashboard');
              router.push('/dashboard');
            } else {
              // Company doesn't exist, clear it and go to onboarding
              console.log('Company not found, clearing company ID and redirecting to onboarding');
              setCurrentCompanyId(null);
              router.push('/onboarding');
            }
          } catch (error) {
            console.error('Error checking company existence:', error);
            // On error, go to onboarding to be safe
            console.log('Error checking company, clearing company ID and redirecting to onboarding');
            setCurrentCompanyId(null);
            router.push('/onboarding');
          }
        } else if (isAuthenticated && currentCompanyId && pathname === '/onboarding') {
          // If user has company ID and is on onboarding, redirect to dashboard
          console.log('User has company ID, redirecting from onboarding to dashboard');
          router.push('/dashboard');
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
        // Check for existing company ID but don't require it for new users
        const companyIdFromStorage = localStorage.getItem(COMPANY_ID_LOCAL_STORAGE_KEY);
        if (companyIdFromStorage) {
          setCurrentCompanyIdState(companyIdFromStorage);
        }

        if (additionalUserInfo?.isNewUser) {
          await updateProfile(result.user, {
            displayName: result.user.displayName || 'New User',
            photoURL: result.user.photoURL,
          });
          setUser(auth.currentUser ? { ...auth.currentUser } : null);

          // New users will go through onboarding, so no notification yet
        } else {
          // Existing user - add notification if they have a company
          if (companyIdFromStorage) {
            await addNotification(
              `User ${result.user.displayName || 'User'} (...${result.user.uid.slice(-6)}) signed in to company ${companyIdFromStorage}.`,
              'user_joined',
              companyIdFromStorage,
              result.user.uid
            );
          }
        }
      }
      // Authentication flow will handle navigation
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

  const checkCompanyExists = async (companyId: string): Promise<boolean> => {
    try {
      const company = await getCompany(companyId);
      return company !== null;
    } catch (error) {
      console.error('Error checking company existence:', error);
      return false;
    }
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
      logout,
      checkCompanyExists
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

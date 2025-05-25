
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { auth } from '@/lib/firebase'; // Import Firebase auth instance
import type { User as FirebaseUser } from 'firebase/auth';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo
} from 'firebase/auth';
// Removed unused LoginFormInputs and SignupFormInputs
import { addNotification } from '@/lib/data-service';


interface AuthContextType {
  user: FirebaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  updateUserProfileName: (newName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false);
    });
    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  const isAuthenticated = !!user;

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && pathname !== '/') { // If not authenticated and not on the new login page
        router.push('/'); // Redirect to the new company login page
      }
      if (isAuthenticated && pathname === '/') { // If authenticated and on the login page
         router.push('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, router, pathname]);


  const signInWithGoogle = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const additionalUserInfo = getAdditionalUserInfo(result);
      
      if (additionalUserInfo?.isNewUser && result.user) {
        await updateProfile(result.user, { // Ensure displayName and photoURL are set from Google
            displayName: result.user.displayName,
            photoURL: result.user.photoURL,
        });
        setUser(auth.currentUser); // Update local state with potentially new profile info

        await addNotification(
          `User ${result.user.displayName || 'New User'} (...${result.user.uid.slice(-6)}) joined KENESIS via Google.`,
          'user_joined',
          result.user.uid
        );
      }
      // onAuthStateChanged will also trigger and ensure user state is up-to-date and redirect.
    } catch (error: any) {
      setIsLoading(false);
      console.error("Google Sign-In error:", error);
      throw error; 
    }
  };

  const updateUserProfileName = async (newName: string) => {
    if (!auth.currentUser) {
      throw new Error("No user currently signed in to update profile.");
    }
    setIsLoading(true);
    try {
      await updateProfile(auth.currentUser, { displayName: newName });
      setUser(auth.currentUser ? { ...auth.currentUser, displayName: newName } : null);
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
      router.push('/'); // Redirect to new company login page on logout
    } catch (error) {
      console.error("Firebase logout error:", error);
      setIsLoading(false);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, signInWithGoogle, updateUserProfileName, logout }}>
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

    
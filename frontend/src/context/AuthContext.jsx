import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from '../components/NotificationToast';
import { auth, GoogleAuthProvider, isFirebaseInitialized, isMockAllowed } from '../firebase';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { api } from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFirebase, setIsFirebase] = useState(isFirebaseInitialized);

  /**
   * Sync user with backend DB and get full profile (with reputation/badges)
   */
  const syncWithBackend = async (firebaseUser) => {
    try {
      const backendUser = await api.syncUser({
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.name || 'Citizen Hero',
        photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${firebaseUser.uid}`,
        email: firebaseUser.email || ''
      });
      return {
        uid: backendUser.uid,
        displayName: backendUser.name || firebaseUser.displayName || 'Citizen Hero',
        name: backendUser.name,
        email: backendUser.email || firebaseUser.email,
        photoURL: backendUser.photoURL || firebaseUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${firebaseUser.uid}`,
        reputation: backendUser.reputation || 120,
        badges: backendUser.badges || ['Community Hero'],
        role: (firebaseUser.email || '').endsWith('@gov.org') ? 'admin' : 'citizen',
        volunteerHours: backendUser.volunteerHours || 0,
        solvedCount: backendUser.solvedCount || 0,
        projectsJoinedCount: backendUser.projectsJoinedCount || 0,
      };
    } catch (e) {
      console.warn('Backend user sync failed, using basic profile:', e.message);
    }
    // Fallback if backend unreachable
    return {
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName || firebaseUser.name || 'Citizen Hero',
      name: firebaseUser.displayName || firebaseUser.name || 'Citizen Hero',
      email: firebaseUser.email || '',
      photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${firebaseUser.uid}`,
      reputation: 120,
      badges: ['Community Hero'],
      role: (firebaseUser.email || '').endsWith('@gov.org') ? 'admin' : 'citizen'
    };
  };

  useEffect(() => {
    if (isFirebaseInitialized) {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          const fullUser = await syncWithBackend(firebaseUser);
          setUser(fullUser);
        } else {
          setUser(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      if (isMockAllowed) {
        initMockAuth();
      } else {
        toast.error("Firebase Auth initialization failed and Mock Mode is disabled in production.");
        setLoading(false);
      }
    }
  }, []);

  const initMockAuth = () => {
    setIsFirebase(false);
    const cachedUser = localStorage.getItem('hero_user');
    if (cachedUser) {
      try {
        setUser(JSON.parse(cachedUser));
      } catch (e) {
        console.warn("Malformed cached user JSON, clearing local storage", e);
        localStorage.removeItem('hero_user');
      }
    }
    setLoading(false);
  };

  /**
   * Google Sign In Trigger
   */
  const loginWithGoogle = async (asRole = 'citizen', forceMock = false) => {
    setLoading(true);
    if (isFirebaseInitialized && !forceMock) {
      try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const firebaseUser = result.user;
        const fullUser = await syncWithBackend(firebaseUser);
        setUser(fullUser);
      } catch (error) {
        console.error("Google Sign-In failed:", error);
        toast.error(`Google Sign-In failed: ${error.message || error}`);
      } finally {
        setLoading(false);
      }
    } else {
      if (!isMockAllowed) {
        toast.error("Mock sign-in is disabled in production.");
        setLoading(false);
        return;
      }

      // Generate a unique mock user per session (not hardcoded)
      const mockId = `mock-${Date.now()}`;
      const names = ['Jordan Rivera', 'Sam Patel', 'Casey Kim', 'Alex Torres', 'Morgan Lee'];
      const randomName = names[Math.floor(Math.random() * names.length)];
      
      const mockUser = {
        uid: mockId,
        displayName: randomName,
        name: randomName,
        email: `${randomName.split(' ')[0].toLowerCase()}@community.local`,
        photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${mockId}`,
        reputation: 120,
        badges: ['Community Hero'],
        role: asRole,
        volunteerHours: 0,
        solvedCount: 0,
        projectsJoinedCount: 0
      };

      await syncWithBackend(mockUser);
      localStorage.setItem('hero_user', JSON.stringify(mockUser));
      setUser(mockUser);
      setLoading(false);
    }
  };

  /**
   * Sign Out Trigger
   */
  const logout = async () => {
    setLoading(true);
    if (isFirebaseInitialized && isFirebase) {
      try {
        await signOut(auth);
        setUser(null);
      } catch (err) {
        console.error("Error signing out:", err);
      } finally {
        setLoading(false);
      }
    } else {
      localStorage.removeItem('hero_user');
      setUser(null);
      setLoading(false);
    }
  };

  /**
   * Refresh user profile from backend (call after earning points)
   */
  const refreshUserProfile = async () => {
    if (!user) return;
    try {
      const data = await api.getUserStats(user.uid);
      const updatedUser = {
        ...user,
        reputation: data.reputation || user.reputation,
        badges: data.badges || user.badges,
        volunteerHours: data.volunteerHours || 0,
        solvedCount: data.solvedCount || 0,
        projectsJoinedCount: data.projectsJoinedCount || 0,
      };
      setUser(updatedUser);
      if (!isFirebase) {
        localStorage.setItem('hero_user', JSON.stringify(updatedUser));
      }
    } catch (e) {
      console.warn("Failed to refresh user profile from backend", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isFirebase, loginWithGoogle, logout, refreshUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}


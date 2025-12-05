import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, googleProvider, db, storage } from '../firebaseConfig';
import { UserProfile, UserMap, ViewState } from '../types';

export interface AppUser {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
  isAnonymous?: boolean;
  emailVerified?: boolean;
}

interface UseAuthReturn {
  user: AppUser | null;
  userProfile: UserProfile | null;
  isCheckingStatus: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<{ needsVerification: boolean; needsApproval: boolean }>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  loginAsGuest: () => Promise<UserMap>;
  logout: () => Promise<void>;
  refreshStatus: () => Promise<{ emailVerified: boolean; approved: boolean }>;
  updateUserProfile: (displayName?: string, photoFile?: File) => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AppUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          displayName: currentUser.isAnonymous ? 'Guest' : currentUser.displayName,
          photoURL: currentUser.photoURL,
          email: currentUser.email,
          isAnonymous: currentUser.isAnonymous,
          emailVerified: currentUser.emailVerified
        });
      } else {
        setUser(null);
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Check user approval status for real users and normalize profile structure
  useEffect(() => {
    const checkStatus = async () => {
      if (!user || user.isAnonymous) return;

      setIsCheckingStatus(true);
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const rawProfile = userSnap.data();
          const updates: Partial<UserProfile> = {};
          
          // === PROFILE NORMALIZATION ===
          // Ensure all required fields exist with correct types
          
          // Sync emailVerified from Firebase Auth
          if (rawProfile.emailVerified !== user.emailVerified) {
            updates.emailVerified = user.emailVerified;
          }
          
          // Ensure email exists
          if (!rawProfile.email && user.email) {
            updates.email = user.email;
          }
          
          // Sync displayName from Firebase Auth if profile doesn't have it
          if (!rawProfile.displayName && user.displayName) {
            updates.displayName = user.displayName;
          }
          
          // Sync photoURL from Firebase Auth if profile doesn't have it
          if (!rawProfile.photoURL && user.photoURL) {
            updates.photoURL = user.photoURL;
          }
          
          // Ensure status exists (default to 'approved' for legacy accounts without status)
          if (!rawProfile.status) {
            // Legacy accounts that were created before status system should be approved
            updates.status = 'approved';
          }
          
          // Ensure role exists (default to 'user', preserve 'admin' if exists)
          if (!rawProfile.role) {
            updates.role = 'user';
          }
          
          // Ensure createdAt exists
          if (!rawProfile.createdAt) {
            updates.createdAt = new Date().toISOString();
          }
          
          // Ensure joinedMaps is an array
          if (rawProfile.joinedMaps && !Array.isArray(rawProfile.joinedMaps)) {
            updates.joinedMaps = [];
          }
          
          // Apply updates if any
          if (Object.keys(updates).length > 0) {
            console.log('Normalizing user profile:', user.uid, updates);
            await updateDoc(userRef, updates);
          }
          
          // Create normalized profile object
          const normalizedProfile: UserProfile = {
            email: rawProfile.email || user.email || 'unknown',
            displayName: rawProfile.displayName || user.displayName,
            photoURL: rawProfile.photoURL || user.photoURL || null,
            status: rawProfile.status || updates.status || 'pending',
            emailVerified: rawProfile.emailVerified ?? user.emailVerified ?? false,
            role: rawProfile.role || updates.role || 'user',
            createdAt: rawProfile.createdAt || updates.createdAt || new Date().toISOString(),
            joinedMaps: Array.isArray(rawProfile.joinedMaps) ? rawProfile.joinedMaps : []
          };
          
          setUserProfile(normalizedProfile);
        } else {
          const newProfile: UserProfile = {
            email: user.email || 'unknown',
            displayName: user.displayName || undefined,
            photoURL: user.photoURL,
            status: 'pending',
            emailVerified: user.emailVerified,
            role: 'user',
            createdAt: new Date().toISOString()
          };
          await setDoc(userRef, newProfile);
          setUserProfile(newProfile);
        }
      } catch (err) {
        console.error("Error checking user status:", err);
      } finally {
        setIsCheckingStatus(false);
      }
    };

    if (user && !user.isAnonymous) {
      checkStatus();
    }
  }, [user]);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed", error);
      throw new Error("Login failed. Please try again.");
    }
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Set displayName on Firebase Auth profile
      await updateProfile(firebaseUser, { displayName });

      // Send verification email
      await sendEmailVerification(firebaseUser);

      // Create user profile in Firestore
      const userRef = doc(db, "users", firebaseUser.uid);
      const newProfile: UserProfile = {
        email: email,
        displayName: displayName,
        photoURL: null,
        status: 'pending',
        emailVerified: false,
        role: 'user',
        createdAt: new Date().toISOString()
      };
      await setDoc(userRef, newProfile);

    } catch (error: any) {
      console.error("Sign up failed", error);
      if (error.code === 'auth/email-already-in-use') {
        throw new Error("This email is already registered. Please sign in instead.");
      } else if (error.code === 'auth/weak-password') {
        throw new Error("Password should be at least 6 characters.");
      } else if (error.code === 'auth/invalid-email') {
        throw new Error("Invalid email address.");
      }
      throw new Error("Sign up failed. Please try again.");
    }
  };

  const loginWithEmail = async (email: string, password: string): Promise<{ needsVerification: boolean; needsApproval: boolean }> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Check email verification
      const needsVerification = !firebaseUser.emailVerified;

      // Check admin approval
      const userRef = doc(db, "users", firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      let needsApproval = true;

      if (userSnap.exists()) {
        const profile = userSnap.data() as UserProfile;
        needsApproval = profile.status !== 'approved';
      }

      return { needsVerification, needsApproval };
    } catch (error: any) {
      console.error("Login failed", error);
      // Handle various Firebase auth error codes
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
        case 'auth/invalid-login-credentials':
          throw new Error("Invalid email or password. Please check your credentials and try again.");
        case 'auth/user-disabled':
          throw new Error("This account has been disabled. Please contact support.");
        case 'auth/too-many-requests':
          throw new Error("Too many failed login attempts. Please try again later or reset your password.");
        case 'auth/network-request-failed':
          throw new Error("Network error. Please check your internet connection and try again.");
        case 'auth/invalid-email':
          throw new Error("Invalid email address format.");
        default:
          throw new Error("Login failed. Please try again.");
      }
    }
  };

  const resendVerificationEmail = async () => {
    const currentUser = auth.currentUser;
    if (currentUser && !currentUser.emailVerified) {
      await sendEmailVerification(currentUser);
    }
  };

  const loginAsGuest = async (): Promise<UserMap> => {
    // Local-only guest user - no Firebase account created
    const guestProfile: UserProfile = {
      email: 'guest@tracebook.app',
      status: 'approved',
      emailVerified: true,
      role: 'guest',
      createdAt: new Date().toISOString()
    };

    const guestUser: AppUser = {
      uid: 'guest-user',
      displayName: 'Guest',
      photoURL: null,
      email: 'guest@tracebook.app',
      isAnonymous: true,
      emailVerified: true
    };

    setUser(guestUser);
    setUserProfile(guestProfile);

    const demoMap: UserMap = {
      id: 'guest-demo-map',
      ownerUid: 'demo-owner',
      ownerDisplayName: 'Demo',
      name: 'Demo Map',
      visibility: 'public',
      isDefault: true,
      createdAt: new Date().toISOString()
    };

    return demoMap;
  };

  const logout = async () => {
    if (user?.isAnonymous) {
      // Guest user is local-only, just clear state
      setUser(null);
      setUserProfile(null);
    } else {
      await signOut(auth);
    }
  };

  const refreshStatus = async (): Promise<{ emailVerified: boolean; approved: boolean }> => {
    if (!user || user.isAnonymous) return { emailVerified: true, approved: true };

    setIsCheckingStatus(true);
    try {
      // Reload user to get latest emailVerified status
      await auth.currentUser?.reload();
      const currentUser = auth.currentUser;
      const emailVerified = currentUser?.emailVerified || false;
      
      // Update user state
      if (currentUser) {
        setUser(prev => prev ? { ...prev, emailVerified } : prev);
      }

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data() as UserProfile;
        
        // Update emailVerified in Firestore if changed
        if (userData.emailVerified !== emailVerified) {
          await updateDoc(userRef, { emailVerified });
          userData.emailVerified = emailVerified;
        }
        
        setUserProfile(userData);
        return { emailVerified, approved: userData.status === 'approved' };
      }
      return { emailVerified, approved: false };
    } catch (e) {
      console.error(e);
      return { emailVerified: false, approved: false };
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const updateUserProfile = async (displayName?: string, photoFile?: File): Promise<void> => {
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.isAnonymous) {
      throw new Error("No authenticated user");
    }

    let photoURL = user?.photoURL || null;

    // Upload photo if provided
    if (photoFile) {
      const storageRef = ref(storage, `profile-photos/${currentUser.uid}`);
      await uploadBytes(storageRef, photoFile);
      photoURL = await getDownloadURL(storageRef);
    }

    // Update Firebase Auth profile
    await updateProfile(currentUser, {
      displayName: displayName || currentUser.displayName,
      photoURL: photoURL
    });

    // Update Firestore profile
    const userRef = doc(db, "users", currentUser.uid);
    const updates: Partial<UserProfile> = {};
    if (displayName) updates.displayName = displayName;
    if (photoURL) updates.photoURL = photoURL;

    if (Object.keys(updates).length > 0) {
      await updateDoc(userRef, updates);
    }

    // Update local state
    setUser(prev => prev ? {
      ...prev,
      displayName: displayName || prev.displayName,
      photoURL: photoURL
    } : prev);

    setUserProfile(prev => prev ? {
      ...prev,
      displayName: displayName || prev.displayName,
      photoURL: photoURL
    } : prev);
  };

  return {
    user,
    userProfile,
    isCheckingStatus,
    login,
    loginWithEmail,
    signUpWithEmail,
    resendVerificationEmail,
    loginAsGuest,
    logout,
    refreshStatus,
    updateUserProfile
  };
}

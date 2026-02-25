'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    onAuthStateChanged,
    signInWithPopup,
    signOut,
    User,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, googleProvider, githubProvider } from '../lib/firebase';

interface UserData {
    credits: number;
    isPro: boolean;
}

interface AuthContextType {
    user: User | null;
    userData: UserData | null;
    loading: boolean;
    loginWithGoogle: () => Promise<void>;
    loginWithGithub: () => Promise<void>;
    loginWithEmail: (email: string, pass: string) => Promise<void>;
    signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeDoc: (() => void) | undefined;

        const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
            setUser(authUser);
            if (authUser) {
                // Listen to the user document for live credit updates
                unsubscribeDoc = onSnapshot(doc(db, "users", authUser.uid), (docSnap) => {
                    if (docSnap.exists()) {
                        setUserData({
                            credits: docSnap.data().credits || 0,
                            isPro: docSnap.data().isPro || false
                        });
                    } else {
                        setUserData({ credits: 0, isPro: false });
                    }
                });
            } else {
                setUserData(null);
                if (unsubscribeDoc) unsubscribeDoc();
            }
            setLoading(false);
        });
        return () => {
            unsubscribeAuth();
            if (unsubscribeDoc) unsubscribeDoc();
        };
    }, []);

    const loginWithGoogle = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Google Sign-In Error:", error);
            throw error;
        }
    };

    const loginWithGithub = async () => {
        try {
            await signInWithPopup(auth, githubProvider);
        } catch (error) {
            console.error("GitHub Sign-In Error:", error);
            throw error;
        }
    };

    const loginWithEmail = async (email: string, pass: string) => {
        try {
            await signInWithEmailAndPassword(auth, email, pass);
        } catch (error) {
            console.error("Email Login Error:", error);
            throw error;
        }
    };

    const signUpWithEmail = async (email: string, pass: string, name: string) => {
        try {
            const res = await createUserWithEmailAndPassword(auth, email, pass);
            if (res.user) {
                await updateProfile(res.user, { displayName: name });
                // Force state update for name
                setUser({ ...res.user, displayName: name });
            }
        } catch (error) {
            console.error("Email Sign-Up Error:", error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Logout Error:", error);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            userData,
            loading,
            loginWithGoogle,
            loginWithGithub,
            loginWithEmail,
            signUpWithEmail,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

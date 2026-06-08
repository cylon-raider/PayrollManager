/**
 * Authentication & Authorization Context Provider
 * 
 * Exposes global authentication state (`user` from Firebase Auth) and custom authorization
 * metadata (`appUser` role from Cloud Firestore). Implements navigation guards, role-based
 * privileges (admin/viewer), and automatic first-user escalation to bootstrap administration.
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, setDoc, getCountFromServer, collection } from "firebase/firestore";
import { auth, db } from "../services/firebase";

// Define strict access roles
export type UserRole = 'admin' | 'viewer';

/**
 * AppUser represents the database record inside Firestore `/users/{uid}`
 */
interface AppUser {
    uid: string;
    email: string | null;
    role: UserRole;
}

/**
 * Interface representing the exposed React Context structure
 */
interface AuthContextType {
    user: User | null;         // Raw Firebase Auth user session
    appUser: AppUser | null;   // Firestore user document containing roles
    loading: boolean;          // App-wide auth initializing state flag
    isAdmin: boolean;          // Quick selector checking if user is admin
}

// Instantiate React Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Provider wrapper for the React application.
 * Wraps layout components and listens to live authentication state.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [appUser, setAppUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Registers a listener for authentication state changes (sign in, sign out, token refresh)
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                try {
                    // Internal function to perform Firestore user metadata retrieval/instantiation
                    const fetchRole = async () => {
                        const userDocRef = doc(db, "users", currentUser.uid);
                        const userSnap = await getDoc(userDocRef);

                        if (userSnap.exists()) {
                            // User document exists, apply local state roles
                            setAppUser(userSnap.data() as AppUser);
                        } else {
                            /**
                             * BOOTSTRAPPING LOGIC (First-time user)
                             * If no document exists in the `/users` collection for this UID,
                             * count the total documents in the collection:
                             * - If count == 0: This is the VERY first user registering. Grant 'admin'.
                             * - If count > 0: Other users exist. Default to read-only 'viewer' role.
                             */
                            const usersColl = collection(db, "users");
                            const snapshot = await getCountFromServer(usersColl);
                            const isFirstUser = snapshot.data().count === 0;

                            const newRole: UserRole = isFirstUser ? 'admin' : 'viewer';

                            const newAppUser: AppUser = {
                                uid: currentUser.uid,
                                email: currentUser.email,
                                role: newRole
                            };

                            // Save user profile metadata to Firestore
                            await setDoc(userDocRef, newAppUser);
                            setAppUser(newAppUser);
                        }
                    };

                    /**
                     * TIMEOUT PROTECTION PATTERN
                     * Races the Firestore fetch request against a 3-second timeout.
                     * Prevents application from hanging indefinitely on a loading spinner
                     * due to cold starts, poor connection quality, or security rule rejections.
                     */
                    await Promise.race([
                        fetchRole(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout fetching role")), 3000))
                    ]);

                } catch (error) {
                    // Fallback to viewer role on error or query timeout so the application still loads.
                    console.error("Auth Error (Defaulting to Viewer):", error);
                    setAppUser({
                        uid: currentUser.uid,
                        email: currentUser.email,
                        role: 'viewer'
                    });
                }
            } else {
                // Clear user states when unauthenticated
                setAppUser(null);
            }

            // Authentication handshake complete
            setLoading(false);
        });

        // Unsubscribe the Firebase listener on component unmount to prevent leaks
        return () => unsubscribe();
    }, []);

    const value = {
        user,
        appUser,
        loading,
        isAdmin: appUser?.role === 'admin'
    };

    // Global full-page loader until Auth state is resolved
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

/**
 * Custom React Hook to consume the AuthContext state inside components.
 * Throws a helpful runtime error if called outside an `<AuthProvider>`.
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

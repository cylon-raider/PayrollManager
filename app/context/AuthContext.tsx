import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, setDoc, getCountFromServer, collection } from "firebase/firestore";
import { auth, db } from "../services/firebase";

export type UserRole = 'admin' | 'viewer';

interface AppUser {
    uid: string;
    email: string | null;
    role: UserRole;
}

interface AuthContextType {
    user: User | null;
    appUser: AppUser | null;
    loading: boolean;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [appUser, setAppUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                try {
                    // Wrap fetching in a timeout promise to prevent hanging
                    const fetchRole = async () => {
                        // Check if user doc exists
                        const userDocRef = doc(db, "users", currentUser.uid);
                        const userSnap = await getDoc(userDocRef);

                        if (userSnap.exists()) {
                            setAppUser(userSnap.data() as AppUser);
                        } else {
                            // First time user logic
                            // Check if this is the VERY first user in the system
                            const usersColl = collection(db, "users");
                            const snapshot = await getCountFromServer(usersColl);
                            const isFirstUser = snapshot.data().count === 0;

                            const newRole: UserRole = isFirstUser ? 'admin' : 'viewer';

                            const newAppUser: AppUser = {
                                uid: currentUser.uid,
                                email: currentUser.email,
                                role: newRole
                            };

                            await setDoc(userDocRef, newAppUser);
                            setAppUser(newAppUser);
                        }
                    };

                    // Race the fetch against a 3-second timeout
                    await Promise.race([
                        fetchRole(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout fetching role")), 3000))
                    ]);

                } catch (error) {
                    console.error("Auth Error (Defaulting to Viewer):", error);
                    // Fallback to viewer on error/timeout so app loads
                    setAppUser({
                        uid: currentUser.uid,
                        email: currentUser.email,
                        role: 'viewer'
                    });
                }
            } else {
                setAppUser(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const value = {
        user,
        appUser,
        loading,
        isAdmin: appUser?.role === 'admin'
    };

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

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

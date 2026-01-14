import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

import { auth } from './firebase';
import { googleProvider } from './authProviders';

const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
  const loginWithEmail = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);
  const signupWithEmail = (email, password) =>
    createUserWithEmailAndPassword(auth, email, password);
  const logout = () => signOut(auth);

  const value = useMemo(
    () => ({
      currentUser,
      loading,
      loginWithGoogle,
      loginWithEmail,
      signupWithEmail,
      logout,
    }),
    [currentUser, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

const useAuth = () => useContext(AuthContext);

export { AuthProvider, useAuth };

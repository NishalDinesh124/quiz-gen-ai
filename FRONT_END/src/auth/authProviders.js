import { GoogleAuthProvider } from "firebase/auth";

const googleProvider = new GoogleAuthProvider();

// TODO: Enable AppleAuthProvider when Apple Sign-In is wired up.
const appleProvider = null;

export { appleProvider, googleProvider };

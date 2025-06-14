"use client";

import { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase";
import { useRouter } from "next/navigation";
import "./page.css";
import Link from "next/link";

// دالة لتحويل أكواد الأخطاء لرسائل مفهومة
function getFriendlyErrorMessage(error) {
  const errorCode = error.code || "";
  switch (errorCode) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-not-found":
      return "No account found with this email.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later.";
    default:
      return "Oops! Something went wrong. Please try again.";
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        router.push("/profile");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogin = async () => {
    setErrorMessage("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("Logged in user:", auth.currentUser);

      router.push("/profile");
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error));
    }
  };

  return (
    <div className="login-container">
      <h1 className="welcome">Welcome to ABS 2025!</h1>
      <h1 className="login-title">Login</h1>

      <input
        className="login-input"
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        className="login-input"
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {errorMessage && <div className="error-message">{errorMessage}</div>}

      <button className="login-button" onClick={handleLogin}>
        Login
      </button>

      <p className="login-switch">
        New account?{" "}
        <Link href="/signup" className="signup">
          Sign up here
        </Link>
      </p>
    </div>
  );
}

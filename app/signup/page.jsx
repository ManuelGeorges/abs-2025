"use client";

import { useState, useEffect } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import "./page.css";

const teams = [
  { value: "ephesus", label: "أفسس" },
  { value: "smyrna", label: "سميرنا" },
  { value: "pergamos", label: "برغامس" },
  { value: "thyatira", label: "ثياتيرا" },
  { value: "sardis", label: "ساردس" },
  { value: "philadelphia", label: "فيلادلفيا" },
  { value: "laodicea", label: "لاودكيه" },
  { value: "heavenly_jerusalem", label: "أورشاليم السماوية" },
];

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [grade, setGrade] = useState("");
  const [teamKey, setTeamKey] = useState("");
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

  const handleSignup = async () => {
    setErrorMessage("");
    if (!gender || !grade || !teamKey) {
      setErrorMessage("Please fill all fields.");
      return;
    }
    if (!email || !password || !name) {
      setErrorMessage("Please fill all required fields.");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // تخزين بيانات المستخدم + الباسورد في Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        name: name,
        gender: gender,
        grade: grade,
        teamKey: teamKey,
        role: "user",
        password: password, // خلي بالك! تخزين الباسورد نص نص، مش آمن للاستخدام الحقيقي
      });

      router.push("/profile");
    } catch (error) {
      if (error.code === "auth/invalid-email") setErrorMessage("البريد الإلكتروني غير صالح.");
      else if (error.code === "auth/email-already-in-use") setErrorMessage("البريد الإلكتروني مستخدم من قبل.");
      else if (error.code === "auth/weak-password") setErrorMessage("كلمة المرور ضعيفة، حاول كلمة أقوى.");
      else setErrorMessage("حدث خطأ، حاول مرة أخرى.");
    }
  };

  return (
    <div className="signup-container">
      <h1 className="welcome">Welcome to ABS 2025!</h1>
      <h1 className="signup-title">Sign Up</h1>

      <input
        type="text"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="signup-input"
      />

      <input
        type="email"
        placeholder="Your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="signup-input"
      />

      <input
        type="password"
        placeholder="Your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="signup-input"
      />

      <select
        className="signup-select"
        value={gender}
        onChange={(e) => setGender(e.target.value)}
      >
        <option value="">Select Gender</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
      </select>

      <select
        className="signup-select"
        value={grade}
        onChange={(e) => setGrade(e.target.value)}
      >
        <option value="">Select Grade</option>
        <option value="first_preparatory">First Preparatory</option>
        <option value="second_preparatory">Second Preparatory</option>
        <option value="third_preparatory">Third Preparatory</option>
      </select>

      <select
        className="signup-select"
        value={teamKey}
        onChange={(e) => setTeamKey(e.target.value)}
      >
        <option value="">Select Team</option>
        {teams.map((team) => (
          <option key={team.value} value={team.value}>
            {team.label}
          </option>
        ))}
      </select>

      {errorMessage && (
        <div className="error-message">{errorMessage}</div>
      )}

      <button onClick={handleSignup} className="signup-button">
        Sign Up
      </button>

      <p className="signup-login-link">
        Already have an account?{" "}
        <span onClick={() => router.push("/login")}>Log in</span>
      </p>
    </div>
  );
}

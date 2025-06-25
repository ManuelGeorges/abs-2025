"use client";

import { useState, useEffect } from "react";
import { auth, db } from "../../lib/firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import "./page.css";

export default function ReportForm() {
  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState({
    question1: "",
    question2: "",
    question3: "",
    question4: "",
    question5: "",
    question6: "",
    question7: "",
    question8: "",
    question9: "",
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setUserData(docSnap.data());
          console.log("userData.teamKey =", docSnap.data().teamKey);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (message) {
      setMessage("");
      setIsError(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // تأكد إن كل الأسئلة متجاوب عليها
    for (let key in formData) {
      if (!formData[key]) {
        setMessage("Please answer all questions.");
        setIsError(true);
        return;
      }
    }

    if (!userData) {
      setMessage("Error: User data is not available.");
      setIsError(true);
      return;
    }

    // حساب رقم الأسبوع بناءً على بداية المنافسة
    const today = new Date();
    const competitionStart = new Date("2025-06-20");

    if (today < competitionStart) {
      setMessage("The competition hasn't started yet. You can't submit a report now.");
      setIsError(true);
      return;
    }

    const diffInDays = Math.floor((today - competitionStart) / (1000 * 60 * 60 * 24));
    const weekNumber = Math.floor(diffInDays / 7) + 1;

    try {
      const reportsRef = collection(db, "reports");
      // تحقق لو المستخدم قدم تقرير لنفس الأسبوع قبل كده
      const q = query(
        reportsRef,
        where("userId", "==", auth.currentUser.uid),
        where("weekNumber", "==", weekNumber)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setMessage("You have already submitted a report for this week.");
        setIsError(true);
        return;
      }

      // اضف التقرير مع تاريخ serverTimestamp (دي مهمة جدًا)
      await addDoc(reportsRef, {
        userId: auth.currentUser.uid,
        username: userData.name,
        email: userData.email,
        gender: userData.gender,
        grade: userData.grade,
        teamKey: userData.teamKey,
        answers: formData,
        weekNumber: weekNumber,
        timestamp: serverTimestamp(),  // <==== هنا التاريخ الحقيقي من السيرفر
        approved: false,
      });

      setMessage("Report submitted successfully!");
      setIsError(false);
      setFormData({
        question1: "",
        question2: "",
        question3: "",
        question4: "",
        question5: "",
        question6: "",
        question7: "",
        question8: "",
        question9: "",
      });
    } catch (error) {
      console.error("Submit error:", error);
      setMessage("An error occurred. Please try again.");
      setIsError(true);
    }
  }

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="form-container">
      <h2>مراجعتي لحياتي الروحية هذا الإسبوع</h2>
      <form onSubmit={handleSubmit}>
        {[
    "هل أنا قمت بحضور قداس في الإسبوع؟",
    "هل أنا اعترفت على مدار الاسبوعين السابقين؟",
    "هل أنا حضرت التسبحة؟",
    "هل أنا قمت بقراءة الجزء المقرر ",
    "هل أنا قمت بنسخ الجزء المقرر ",
    "هل أنا قمت بحفظ المزمور؟",
    "هل أنا حضرت الشرح؟",             
    "هل أنا حضرت المسابقات؟",         
    "هل أنا أتممت المهمة المقررة ",
    
        ].map((q, i) => (
          <div className="question-group" key={`q${i + 1}`}>
            <p className="question-text">{q}</p>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  name={`question${i + 1}`}
                  value="yes"
                  checked={formData[`question${i + 1}`] === "yes"}
                  onChange={handleChange}
                  required
                />
                نعم
              </label>
              <label>
                <input
                  type="radio"
                  name={`question${i + 1}`}
                  value="no"
                  checked={formData[`question${i + 1}`] === "no"}
                  onChange={handleChange}
                />
                لا
              </label>
            </div>
          </div>
        ))}

        <button type="submit" className="submit-btn">
          Send
        </button>
      </form>

      {message && (
        <div className={isError ? "error" : "success"}>
          {message}
        </div>
      )}
    </div>
  );
}

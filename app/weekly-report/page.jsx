// src/app/report/page.jsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { auth, db } from "@/lib/firebase"; // تأكد من المسار الصحيح لـ firebase
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
import "./page.css"; // ملف الـ CSS الجديد

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
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [reportSubmittedForSelectedWeek, setReportSubmittedForSelectedWeek] =
    useState(false);
  const [existingReportAnswers, setExistingReportAnswers] = useState(null);

  // تحديث هذه القائمة لتتناسب مع عدد الأسئلة الفعلية في الفورم
  const questions = [
    "هل أنا قمت بحضور قداس في الإسبوع؟",
    "هل أنا اعترفت على مدار الاسبوعين السابقين؟",
    "هل أنا حضرت التسبحة؟",
    "هل أنا قمت بقراءة الجزء المقرر؟",
    "هل أنا قمت بنسخ الجزء المقرر؟",
    "هل أنا قمت بحفظ المزمور؟",
    "هل أنا حضرت الشرح؟",
    "هل أنا حضرت المسابقات؟",
    "هل أنا أتممت المهمة المقررة؟",
  ];

  // تحديد تاريخ بداية المنافسة
  const COMPETITION_START_DATE = new Date("2025-06-20"); // حسب التاريخ اللي كان في الكود بتاعك

  // حساب الأسابيع المتاحة ديناميكيا
  useEffect(() => {
    const today = new Date();
    const tempWeeks = [];
    let weekCounter = 1;
    let currentWeekStartDate = new Date(COMPETITION_START_DATE);

    // نلف لحد ما نوصل للأسبوع الحالي أو بعده
    while (currentWeekStartDate <= today) {
      tempWeeks.push(weekCounter);
      currentWeekStartDate.setDate(currentWeekStartDate.getDate() + 7); // أضف 7 أيام للأسبوع التالي
      weekCounter++;
    }

    setAvailableWeeks(tempWeeks);
    // لو فيه أسابيع متاحة، اختار الأسبوع الأخير (الأسبوع الحالي) بشكل افتراضي
    if (tempWeeks.length > 0) {
      setSelectedWeek(tempWeeks[tempWeeks.length - 1]);
    }
  }, []);

  // دالة لجلب بيانات التقرير للأسبوع المحدد
  const fetchReportData = useCallback(
    async (userId, week) => {
      if (!userId || !week) return;

      setLoading(true);
      setMessage("");
      setIsError(false);
      try {
        const reportsRef = collection(db, "reports");
        const q = query(
          reportsRef,
          where("userId", "==", userId),
          where("weekNumber", "==", week)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          // التقرير موجود
          setReportSubmittedForSelectedWeek(true);
          setExistingReportAnswers(querySnapshot.docs[0].data().answers);
          // لا تقوم بملء formData لكي لا يتم تعديلها
        } else {
          // التقرير غير موجود
          setReportSubmittedForSelectedWeek(false);
          setExistingReportAnswers(null);
          // إفراغ formData عشان المستخدم يكتب من جديد
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
        }
      } catch (error) {
        console.error("Error fetching report for week:", error);
        setMessage("Error loading report for this week.");
        setIsError(true);
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setMessage, setIsError]
  );

  // useEffect لتحميل بيانات المستخدم والتحقق من التقرير عند تغيير الأسبوع
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        // إعادة توجيه المستخدم إذا لم يكن مسجل الدخول
        // window.location.href = "/login"; // أو استخدم useRouter من next/navigation
        return;
      }

      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setUserData(docSnap.data());
          if (selectedWeek !== null) {
            // جلب بيانات التقرير بمجرد توفر بيانات المستخدم والأسبوع المختار
            fetchReportData(user.uid, selectedWeek);
          }
        } else {
          setUserData(null);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setMessage("Error fetching user data.");
        setIsError(true);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchReportData, selectedWeek]); // أضف selectedWeek هنا

  // useEffect إضافي لجلب بيانات التقرير فقط عند تغيير selectedWeek بعد تحميل userData
  useEffect(() => {
    if (userData && selectedWeek !== null && auth.currentUser) {
      fetchReportData(auth.currentUser.uid, selectedWeek);
    }
  }, [selectedWeek, userData, fetchReportData]);

  // دالة لتغيير الأسبوع المختار
  const handleWeekChange = (week) => {
    setSelectedWeek(week);
  };

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

    if (!userData || !auth.currentUser || selectedWeek === null) {
      setMessage("Error: User data or selected week is not available.");
      setIsError(true);
      return;
    }

    // تحقق مرة أخرى لو المستخدم قدم تقرير لنفس الأسبوع قبل كده (لمنع أي محاولات اختراق)
    try {
      const reportsRef = collection(db, "reports");
      const q = query(
        reportsRef,
        where("userId", "==", auth.currentUser.uid),
        where("weekNumber", "==", selectedWeek)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setMessage("You have already submitted a report for this week.");
        setIsError(true);
        return;
      }

      // أضف التقرير مع تاريخ serverTimestamp
      await addDoc(reportsRef, {
        userId: auth.currentUser.uid,
        username: userData.name,
        email: userData.email,
        gender: userData.gender,
        grade: userData.grade,
        teamKey: userData.teamKey,
        answers: formData,
        weekNumber: selectedWeek, // استخدام الأسبوع المختار
        timestamp: serverTimestamp(),
        approved: false, // قيمة افتراضية
      });

      setMessage("Report submitted successfully!");
      setIsError(false);
      setReportSubmittedForSelectedWeek(true); // تحديث الحالة لعرض الإجابات
      setExistingReportAnswers(formData); // تخزين الإجابات المقدمة حديثًا
      // لا تقوم بمسح formData هنا، بل عرضها في وضع القراءة فقط
    } catch (error) {
      console.error("Submit error:", error);
      setMessage("An error occurred. Please try again.");
      setIsError(true);
    }
  }

  if (loading)
    return <div className="form-container loading-state">Loading...</div>;

  // لو مفيش أسابيع متاحة خالص (مثلاً قبل بداية المنافسة)
  if (availableWeeks.length === 0 && !loading) {
    return (
      <div className="form-container">
        <p className="no-data">The competition hasn't started yet.</p>
      </div>
    );
  }

  return (
    <div className="form-container">
      <h2 className="form-title">مراجعتي لحياتي الروحية</h2>

      {/* Week Selector */}
      <div className="week-selector">
        {availableWeeks.map((week) => (
          <button
            key={week}
            onClick={() => handleWeekChange(week)}
            className={`week-btn ${selectedWeek === week ? "selected" : ""}`}
            disabled={loading} // منع الضغط أثناء التحميل
          >
            الأسبوع {week}
          </button>
        ))}
      </div>

      {/* رسالة التحميل أو الخطأ/النجاح */}
      {message && (
        <div className={isError ? "error-message" : "success-message"}>
          {message}
        </div>
      )}

      {selectedWeek === null && (
        <p className="no-data">Please select a week to view or submit a report.</p>
      )}

      {selectedWeek !== null && (
        <>
          <h3 className="week-heading">تقرير الأسبوع {selectedWeek}</h3>
          {reportSubmittedForSelectedWeek ? (
            // عرض الإجابات لو التقرير موجود
            <div className="submitted-report">
              <p className="submitted-message">
                لقد قدمت تقريرك لهذا الأسبوع.
              </p>
              {questions.map((q, i) => (
                <div className="question-display-group" key={`display-q${i + 1}`}>
                  <p className="question-text">{q}</p>
                  <p
                    className={`answer-text ${
                      existingReportAnswers[`question${i + 1}`] === "yes"
                        ? "yes-answer"
                        : "no-answer"
                    }`}
                  >
                    {existingReportAnswers[`question${i + 1}`] === "yes"
                      ? "نعم"
                      : "لا"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            // عرض الفورم لو التقرير مش موجود
            <form onSubmit={handleSubmit}>
              {questions.map((q, i) => (
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
                        disabled={reportSubmittedForSelectedWeek} // تعطيل لو التقرير مقدم
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
                        disabled={reportSubmittedForSelectedWeek} // تعطيل لو التقرير مقدم
                      />
                      لا
                    </label>
                  </div>
                </div>
              ))}
              <button
                type="submit"
                className="submit-btn"
                disabled={reportSubmittedForSelectedWeek || loading} // تعطيل لو التقرير مقدم أو بيحمل
              >
                إرسال التقرير
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { db, auth } from "../../lib/firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import "./page.css";

export default function TeamDashboard() {
  const [teamMembers, setTeamMembers] = useState([]);
  const [reportsMap, setReportsMap] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [attendanceMap, setAttendanceMap] = useState({});

  const questions = [
    "هل قمت بحضور قداس في الإسبوع؟",
    "هل اعترفت على مدار الاسبوعين السابقين؟",
    "هل حضرت التسبحة؟",
    "هل قمت بقراءة الجزء المقرر عليك؟",
    "هل قمت بنسخ الجزء المقرر عليك؟",
    "هل قمت بحفظ المزمور؟",
    "هل حضرت الشرح؟",
    "هل حضرت المسابقات؟",
    "هل أتممت المهمة المقررة عليك؟",
  ];

  const scoreWeights = {
    question1: 0,
    question2: 0,
    question3: 0,
    question4: 10,
    question5: 10,
    question6: 10,
    question7: 5,
    question8: 5,
    question9: 20,
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          setCurrentUser(null);
          setLoading(false);
          return;
        }

        const userData = userSnap.data();
        if (userData.role !== "teamLeader") {
          setCurrentUser(null);
          setLoading(false);
          return;
        }

        setCurrentUser(userData);

        const membersQuery = query(
          collection(db, "users"),
          where("teamKey", "==", userData.teamKey),
          where("role", "==", "user")
        );
        const membersSnapshot = await getDocs(membersQuery);
        const members = membersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const reportsSnapshot = await getDocs(collection(db, "reports"));
        const reportsData = {};
        reportsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.teamKey === userData.teamKey && data.approved !== true) {
            reportsData[data.userId] = { ...data, id: doc.id };
          }
        });

        const startDate = new Date("2025-06-13");
        const today = new Date();
        const diff = today - startDate;
        const currentWeek = Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1;

        const attendanceSnapshot = await getDocs(collection(db, "attendances"));
        const attendanceData = {};
        attendanceSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (
            data.week === currentWeek &&
            (data.type === "lecture" || data.type === "competition")
          ) {
            if (!attendanceData[data.email]) attendanceData[data.email] = {};
            attendanceData[data.email][data.type] = true;
          }
        });

        setTeamMembers(members);
        setReportsMap(reportsData);
        setAttendanceMap(attendanceData);
      } catch (error) {
        console.error(error);
        setMessage("حدث خطأ أثناء جلب البيانات");
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleEdit = async (reportId, newAnswers) => {
    try {
      const reportRef = doc(db, "reports", reportId);
      await updateDoc(reportRef, { answers: newAnswers });
      setMessage("تم تعديل التقرير بنجاح");

      setReportsMap((prev) => ({
        ...prev,
        [reportId]: {
          ...prev[reportId],
          answers: newAnswers,
        },
      }));
    } catch (error) {
      console.error(error);
      setMessage("فشل تعديل التقرير.");
    }
  };

  const handleApprove = async (reportId) => {
    try {
      const reportRef = doc(db, "reports", reportId);
      const reportSnap = await getDoc(reportRef);
      const reportData = reportSnap.data();
      const answers = reportData.answers || {};

      let totalScore = 0;
      for (const key in answers) {
        if (answers[key] === "yes" && scoreWeights[key]) {
          totalScore += scoreWeights[key];
        }
      }

      await updateDoc(reportRef, {
        approved: true,
        score: totalScore,
      });

      setMessage("تمت الموافقة على التقرير وحساب الدرجات!");

      setReportsMap((prev) => {
        const updated = { ...prev };
        delete updated[reportData.userId];
        return updated;
      });
    } catch (error) {
      console.error(error);
      setMessage("فشل في الموافقة على التقرير.");
    }
  };

  if (loading) return <div className="loading">...جاري التحميل</div>;
  if (!currentUser) return <div className="loading">غير مصرح بالدخول</div>;

  return (
    <div className="dashboard-container">
      <h2>تقارير الفريق {currentUser.teamKey}</h2>
      {message && <div className="message">{message}</div>}

      {teamMembers.length === 0 ? (
        <p>لا يوجد أعضاء في الفريق</p>
      ) : (
        teamMembers.map((member) => {
          const report = reportsMap[member.id];
          return (
            <div key={member.id}>
              {report ? (
                <ReportCard
                  member={member}
                  report={report}
                  questions={questions}
                  onEdit={handleEdit}
                  onApprove={() => handleApprove(report.id)}
                  attendanceMap={attendanceMap}
                />
              ) : (
                <div className="report-card">
                  <h3>{member.name}</h3>
                  <p style={{ color: "#999" }}>لم يُرسل التقرير بعد.</p>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function ReportCard({ member, report, questions, onEdit, onApprove, attendanceMap }) {
  const [isEditing, setIsEditing] = useState(false);
  const [answers, setAnswers] = useState(report?.answers || {});

  useEffect(() => {
    setAnswers(report?.answers || {});
  }, [report]);

  const handleChange = (e, questionKey) => {
    setAnswers((prev) => ({
      ...prev,
      [questionKey]: e.target.value,
    }));
  };

  const saveEdit = () => {
    onEdit(report.id, answers);
    setIsEditing(false);
  };

  return (
    <div className="report-card">
      <h3>{member.name}</h3>
      <ul className="answers-list">
        {questions.map((q, i) => {
          const key = `question${i + 1}`;
          const isLecture = q === "هل حضرت الشرح؟";
          const isCompetition = q === "هل حضرت المسابقات؟";
          const signed =
            isLecture
              ? attendanceMap?.[member.email]?.lecture
              : isCompetition
              ? attendanceMap?.[member.email]?.competition
              : undefined;

          return (
            <li key={key}>
              <strong>{q}</strong>:{" "}
              {isEditing ? (
                <select
                  value={answers[key] || ""}
                  onChange={(e) => handleChange(e, key)}
                >
                  <option value="">اختر</option>
                  <option value="yes">نعم</option>
                  <option value="no">لا</option>
                </select>
              ) : (
                <span
                  style={{
                    color:
                      answers[key] === "yes"
                        ? "green"
                        : answers[key] === "no"
                        ? "red"
                        : "#333",
                  }}
                >
                  {answers[key] === "yes"
                    ? "نعم"
                    : answers[key] === "no"
                    ? "لا"
                    : "غير مجاب"}
                </span>
              )}

              {(isLecture || isCompetition) && (
                <span className={`signed-status ${signed ? "signed" : "not-signed"}`}>
                  {signed ? "Signed" : "Not Signed"}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="btn-group">
        {isEditing ? (
          <>
            <button className="btn save-btn" onClick={saveEdit}>
              حفظ
            </button>
            <button
              className="btn cancel-btn"
              onClick={() => {
                setIsEditing(false);
                setAnswers(report.answers);
              }}
            >
              إلغاء
            </button>
          </>
        ) : (
          <>
            <button className="btn edit-btn" onClick={() => setIsEditing(true)}>
              تعديل
            </button>
            {!report.approved && (
              <button className="btn approve-btn" onClick={onApprove}>
                موافقة
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

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
  const [reports, setReports] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const questions = [
    "هل قمت بحضور قداس في الإسبوع؟",
    "هل اعترفت على مدار الاسبوعين السابقين؟",
    "هل قمت بقراءة الجزء المقرر عليك؟",
    "هل قمت بنسخ الجزء المقرر عليك؟",
    "هل قمت بحفظ المزمور؟",
    "هل حضرت الشرح؟",
    "هل حضرت المسابقات؟",
    "هل أتممت المهمة المقررة عليك؟",
    "هل حضرت التسبحة؟",
  ];

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

        if (userData.role !== "team_leader") {
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
        const reportData = {};
        reportsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.teamKey === userData.teamKey && data.approved !== true) {
            reportData[data.userId] = { ...data, id: doc.id };
          }
        });

        setTeamMembers(members);
        setReports(reportData);
      } catch (error) {
        setMessage("حدث خطأ أثناء جلب البيانات");
        console.error(error);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleEdit = async (reportId, newAnswers) => {
    try {
      const reportRef = doc(db, "reports", reportId);
      await updateDoc(reportRef, { answers: newAnswers });
      setMessage("Report updated successfully!");

      setReports((prev) => ({
        ...prev,
        [reportId]: {
          ...prev[reportId],
          answers: newAnswers,
        },
      }));
    } catch (error) {
      setMessage("Failed to update report.");
      console.error(error);
    }
  };

  const handleApprove = async (reportId, userId) => {
    try {
      const reportRef = doc(db, "reports", reportId);
      const reportSnap = await getDoc(reportRef);
      const reportData = reportSnap.data();
      const answers = reportData.answers || {};

      // حساب الدرجات
// حساب الدرجات الجديدة
    const scores = {
      "هل قمت بحضور قداس في الإسبوع؟": 0,
      "هل اعترفت على مدار الاسبوعين السابقين؟": 0,
      "هل قمت بحضور التسبحة التسبحة؟": 0,
      "هل قمت بقراءة الجزء المقرر عليك؟": 10,
      "هل قمت بنسخ الجزء المقرر عليك؟": 10,
      "هل حضرت الشرح؟": 5,
      "هل حضرت المسابقات؟": 5,
      "هل أتممت المهمة المقررة عليك؟": 20,
      "هل قمت بحفظ المزمور؟": 10,
    };


      let totalScore = 0;

      questions.forEach((q, index) => {
        const key = `question${index + 1}`;
        if (answers[key] === "yes") {
          totalScore += scores[q];
        }
      });

      await updateDoc(reportRef, {
        approved: true,
        score: totalScore,
      });

      setMessage("Report approved and score calculated!");

      setReports((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    } catch (error) {
      setMessage("Failed to approve report.");
      console.error(error);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!currentUser) return <div className="loading">Access Denied</div>;

  return (
    <div className="dashboard-container">
      <h2>Team {currentUser.teamKey} Reports</h2>
      {message && <div className="message">{message}</div>}

      {teamMembers.length === 0 ? (
        <p>No team members found</p>
      ) : (
        teamMembers.map((member) => {
          const report = reports[member.id];
          return (
            report && (
              <ReportCard
                key={member.id}
                member={member}
                report={report}
                questions={questions}
                onEdit={handleEdit}
                onApprove={() => handleApprove(report.id, member.id)}
              />
            )
          );
        })
      )}
    </div>
  );
}

function ReportCard({ member, report, questions, onEdit, onApprove }) {
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
      {report ? (
        <ul className="answers-list">
          {questions.map((q, i) => {
            const key = `question${i + 1}`;
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
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="no-report">No report submitted</p>
      )}

      {report && (
        <div className="btn-group">
          {isEditing ? (
            <>
              <button className="btn save-btn" onClick={saveEdit}>
                Save
              </button>
              <button
                className="btn cancel-btn"
                onClick={() => {
                  setIsEditing(false);
                  setAnswers(report.answers);
                }}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button className="btn edit-btn" onClick={() => setIsEditing(true)}>
                Edit
              </button>
              {!report.approved && (
                <button className="btn approve-btn" onClick={onApprove}>
                  Approve
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

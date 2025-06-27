"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import "./idb.css";

export default function DirectorDashboard() {
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [editingReportId, setEditingReportId] = useState(null);
  const [editedAnswers, setEditedAnswers] = useState({});
  const router = useRouter();

  const questions = [
    "هل أنا قمت بحضور قداس في الإسبوع؟",
    "هل أنا اعترفت على مدار الاسبوعين السابقين؟",
    "هل أنا حضرت التسبحة؟",
    "هل أنا قمت بقراءة الجزء المقرر ",
    "هل أنا قمت بنسخ الجزء المقرر ",
    "هل أنا قمت بحفظ المزمور؟",
    "هل أنا حضرت الشرح؟",
    "هل أنا حضرت المسابقات؟",
    "هل أنا أتممت المهمة المقررة ",
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
    question9: 10,
  };

  const calculateScore = (answers) => {
    let total = 0;
    for (const key in answers) {
      if (answers[key] === "yes" && scoreWeights[key]) {
        total += scoreWeights[key];
      }
    }
    return total;
  };

  const handleApprove = async (reportId, answers) => {
    const score = calculateScore(answers);
    try {
      await updateDoc(doc(db, "reports", reportId), {
        approved: true,
        score,
      });
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId ? { ...r, approved: true, score } : r
        )
      );
    } catch (err) {
      console.error("Approval failed", err);
    }
  };

  const handleSaveEdit = async (reportId) => {
    const updatedScore = calculateScore(editedAnswers);
    try {
      await updateDoc(doc(db, "reports", reportId), {
        answers: editedAnswers,
        score: updatedScore,
      });
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? { ...r, answers: editedAnswers, score: updatedScore }
            : r
        )
      );
      setEditingReportId(null);
    } catch (err) {
      console.error("Update failed", err);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) return router.push("/login");

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists() || userDoc.data().role !== "director") {
        return router.push("/unauthorized");
      }
      setUserRole("director");
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!userRole) return;

    const fetchData = async () => {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const usersData = usersSnap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((u) => u.role === "user");

        const reportsQuery = query(
          collection(db, "reports"),
          where("weekNumber", "==", selectedWeek)
        );
        const reportsSnap = await getDocs(reportsQuery);
        const reportsData = reportsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const attendanceSnap = await getDocs(collection(db, "attendances"));
        const attendanceData = {};
        attendanceSnap.forEach((doc) => {
          const data = doc.data();
          if (data.week === selectedWeek) {
            if (!attendanceData[data.email]) {
              attendanceData[data.email] = {};
            }
            attendanceData[data.email][data.type] = true;
          }
        });

        setUsers(usersData);
        setReports(reportsData);
        setAttendanceMap(attendanceData);
        setLoading(false);
      } catch (err) {
        console.error("Data load error", err);
        setLoading(false);
      }
    };

    fetchData();
  }, [userRole, selectedWeek]);

  if (loading) return <div className="dd-loading">Loading...</div>;

  const groupedByTeam = users.reduce((acc, user) => {
    if (!acc[user.teamKey]) acc[user.teamKey] = [];
    acc[user.teamKey].push(user);
    return acc;
  }, {});

  return (
    <div className="dd-director-container">
      <h1>Director Dashboard</h1>
      <div className="dd-week-nav">
        {[1, 2, 3, 4, 5, 6, 7].map((week) => (
          <button
            key={week}
            className={`dd-week-button ${selectedWeek === week ? "active" : ""}`}
            onClick={() => setSelectedWeek(week)}
          >
            Week {week}
          </button>
        ))}
      </div>

      {Object.keys(groupedByTeam).map((teamKey) => (
        <div className="dd-team-card" key={teamKey}>
          <h2>Team: {teamKey}</h2>
          {groupedByTeam[teamKey].map((user) => {
            const report = reports.find((r) => r.email === user.email);
            const score = report ? calculateScore(report.answers) : null;

            return (
              <div className="dd-report-card" key={user.id}>
                <h3>{user.name || user.username}</h3>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Gender:</strong> {user.gender}</p>
                <p><strong>Grade:</strong> {user.grade}</p>

                {report ? (
                  <>
                    <p>
                      <strong>Approved:</strong>{" "}
                      <span className={report.approved ? "dd-approved" : "dd-not-approved"}>
                        {report.approved ? "Yes" : "No"}
                      </span>
                    </p>
                    <div className="dd-answers">
                      {questions.map((qText, index) => {
                        const key = `question${index + 1}`;
                        const isLecture = index === 6;
                        const isCompetition = index === 7;
                        const signed =
                          attendanceMap?.[user.email]?.[
                            isLecture ? "lecture" : isCompetition ? "competition" : ""
                          ];

                        return (
                          <p key={key}>
                            <strong>{qText}</strong>:{" "}
                            {editingReportId === report.id ? (
                              <select
                                value={editedAnswers[key] || ""}
                                onChange={(e) =>
                                  setEditedAnswers((prev) => ({
                                    ...prev,
                                    [key]: e.target.value,
                                  }))
                                }
                              >
                                <option value="">اختر</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                              </select>
                            ) : (
                              <span className={report.answers?.[key] === "yes" ? "dd-yes" : "dd-no"}>
                                {report.answers?.[key] === "yes" ? "Yes" : "No"}
                              </span>
                            )}
                            {(isLecture || isCompetition) && (
                              <span className={`signed-status ${signed ? "signed" : "not-signed"}`}>
                                {signed ? "Signed" : "Not Signed"}
                              </span>
                            )}
                          </p>
                        );
                      })}
                    </div>

                    <p className="dd-score">Score: <span>{score} / 60</span></p>

                    {editingReportId === report.id ? (
                      <div className="dd-buttons">
                        <button onClick={() => handleSaveEdit(report.id)}>Save</button>
                        <button onClick={() => setEditingReportId(null)}>Cancel</button>
                      </div>
                    ) : (
                      <div className="dd-buttons">
                        <button onClick={() => {
                          setEditingReportId(report.id);
                          setEditedAnswers({ ...report.answers });
                        }}>
                          Edit
                        </button>
                        {!report.approved && (
                          <button onClick={() => handleApprove(report.id, report.answers)}>
                            Approve
                          </button>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="dd-no-report">No report for this week.</p>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

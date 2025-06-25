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

  const calculateScore = (answers) => {
    let score = 0;
    for (let i = 0; i < questions.length; i++) {
      const answer = answers?.[`question${i + 1}`];
      if (answer === "yes") {
        if (i === 7 || i === 8) {
          score += 5;
        } else if(i === 3){
          score += 0;}
          else {
          score += 10;
        }
      }
    }
    return score;
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
                        const answer = report.answers?.[`question${index + 1}`];
                        const isLecture = index ===6;
                        const isCompetition = index === 7;
                        const signed =
                          attendanceMap?.[user.email]?.[
                            isLecture ? "lecture" : isCompetition ? "competition" : ""
                          ];

                        return (
                          <p key={`answer-${index}`}>
                            <strong>{qText}</strong>:{" "}
                            <span className={answer === "yes" ? "dd-yes" : "dd-no"}>
                              {answer === "yes" ? "Yes" : "No"}
                            </span>
                            {(isLecture || isCompetition) && (
                              <span className={`signed-status ${signed ? "signed" : "not-signed"}`}>
                                {signed ? "Signed" : "Not Signed"}
                              </span>
                            )}
                          </p>
                        );
                      })}
                    </div>
                    <p className="dd-score">
                      Score: <span>{score} / 80</span>
                    </p>
                    {!report.approved && (
                      <button
                        className="dd-approve-btn"
                        onClick={() => handleApprove(report.id, report.answers)}
                      >
                        Approve Report
                      </button>
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

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
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import "./page.css";

export default function DirectorDashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const router = useRouter();

  const questions = [
    "هل أنا قمت بحضور قداس في الإسبوع؟",
    "هل أنا اعترفت على مدار الاسبوعين السابقين؟",
    "هل أنا قمت بقراءة الجزء المقرر عليك؟",
    "هل أنا قمت بنسخ الجزء المقرر عليك؟",
    "هل أنا قمت بحفظ المزمور؟",
    "هل أنا حضرت الشرح؟",             
    "هل أنا حضرت المسابقات؟",         
    "هل أنا أتممت المهمة المقررة عليك؟",
    "هل أنا حضرت التسبحة؟"
  ];

  const calculateScore = (answers) => {
    let score = 0;
    for (let i = 0; i < questions.length; i++) {
      const answer = answers[`question${i + 1}`];
      if (answer === "yes") {
        if (i === 5 || i === 6) {
          score += 5;
        } else {
          score += 10;
        }
      }
    }
    return score;
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);

        if (!userSnap.exists()) {
          router.push("/login");
          return;
        }

        const data = userSnap.data();
        if (data.role !== "director") {
          router.push("/unauthorized");
          return;
        }

        setUserRole(data.role);
      } catch (error) {
        console.error("Error checking user role:", error);
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!userRole) return;

    const fetchReports = async () => {
      try {
        const q = query(collection(db, "reports"), where("approved", "==", true));
        const snapshot = await getDocs(q);
        const reportsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setReports(reportsData);
      } catch (error) {
        console.error("Error fetching reports:", error);
      }
      setLoading(false);
    };

    fetchReports();
  }, [userRole]);

  if (loading) return <div className="loading">Loading...</div>;

  const filteredReports = reports.filter(r => r.weekNumber === selectedWeek);

  const groupedByTeam = filteredReports.reduce((acc, report) => {
    if (!acc[report.teamKey]) acc[report.teamKey] = [];
    acc[report.teamKey].push(report);
    return acc;
  }, {});

  return (
    <div className="director-container">
      <h1>Director Dashboard</h1>

      <div className="week-nav">
        {[1, 2, 3, 4, 5, 6, 7].map((week) => (
          <button
            key={week}
            className={`week-button ${selectedWeek === week ? "active" : ""}`}
            onClick={() => setSelectedWeek(week)}
          >
            Week {week}
          </button>
        ))}
      </div>

      {Object.keys(groupedByTeam).length === 0 ? (
        <div className="no-data">No approved reports for this week.</div>
      ) : (
        Object.entries(groupedByTeam).map(([teamKey, teamReports]) => (
          <div className="team-card" key={teamKey}>
            <h2>Team: {teamKey}</h2>
            {teamReports.map((report) => {
              const score = calculateScore(report.answers);
              return (
                <div className="report-card" key={report.id}>
                  <h3>{report.username}</h3>
                  <p><strong>Email:</strong> {report.email}</p>
                  <p><strong>Gender:</strong> {report.gender}</p>
                  <p><strong>Grade:</strong> {report.grade}</p>
                  <p>
                    <strong>Approved:</strong>{" "}
                    <span className={report.approved ? "approved" : "not-approved"}>
                      {report.approved ? "Yes" : "No"}
                    </span>
                  </p>

                  <div className="answers">
                    {questions.map((qText, index) => {
                      const answer = report.answers[`question${index + 1}`];
                      return (
                        <p key={`answer-${index}`}>
                          <strong>{qText}:</strong>{" "}
                          <span className={answer === "yes" ? "yes" : "no"}>
                            {answer === "yes" ? "Yes" : "No"}
                          </span>
                        </p>
                      );
                    })}
                  </div>

                  <p className="score">Score: <span>{score} / 80</span></p>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}

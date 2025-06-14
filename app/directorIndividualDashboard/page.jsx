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
import "./idb.css";

export default function DirectorDashboard() {
  const [users, setUsers] = useState([]);
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
    "هل أنا حضرت التسبحة؟",
  ];

  const calculateScore = (answers) => {
    let score = 0;
    for (let i = 0; i < questions.length; i++) {
      const answer = answers?.[`question${i + 1}`];
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

    const fetchData = async () => {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const usersData = usersSnap.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((user) => user.role === "user");

        const reportsQuery = query(
          collection(db, "reports"),
          where("approved", "==", true),
          where("weekNumber", "==", selectedWeek)
        );
        const reportsSnap = await getDocs(reportsQuery);
        const reportsData = reportsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setUsers(usersData);
        setReports(reportsData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
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
                      <span className="dd-approved">Yes</span>
                    </p>
                    <div className="dd-answers">
                      {questions.map((qText, index) => {
                        const answer = report.answers[`question${index + 1}`];
                        return (
                          <p key={`answer-${index}`}>
                            <strong>{qText}:</strong>{" "}
                            <span className={answer === "yes" ? "dd-yes" : "dd-no"}>
                              {answer === "yes" ? "Yes" : "No"}
                            </span>
                          </p>
                        );
                      })}
                    </div>
                    <p className="dd-score">Score: <span>{score} / 80</span></p>
                  </>
                ) : (
                  <p className="dd-no-report">No approved report for this week.</p>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

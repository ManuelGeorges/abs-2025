'use client';

import { useEffect, useState } from "react";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import "./page.css";

export default function ProfilePage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          setUserData(null);
          setLoading(false);
          return;
        }

        const userInfo = userSnap.data();
        setUserData(userInfo);

        if (userInfo.role === "user") {
          const reportsQuery = query(
            collection(db, "reports"),
            where("userId", "==", user.uid),
            where("approved", "==", true)
          );
          const reportsSnapshot = await getDocs(reportsQuery);

          const questQuery = query(
            collection(db, "questScores"),
            where("userId", "==", user.uid)
          );
          const questSnapshot = await getDocs(questQuery);

          const reportMap = {};
          reportsSnapshot.forEach((doc) => {
            const data = doc.data();
            const week = data.weekNumber;
            reportMap[week] = data.score || 0;
          });

          const questMap = {};
          questSnapshot.forEach((doc) => {
            const data = doc.data();
            const date = new Date(data.date);
            const startDate = new Date("2025-06-13");
            const diffDays = Math.floor((date - startDate) / (1000 * 60 * 60 * 24));
            const week = Math.floor(diffDays / 7) + 1;
            if (!questMap[week]) questMap[week] = 0;
            questMap[week] += data.score || 0;
          });

          const allWeeks = Array.from(new Set([...Object.keys(reportMap), ...Object.keys(questMap)]));
          const combined = allWeeks.map((week) => {
            const w = parseInt(week);
            const reportScore = reportMap[w] || 0;
            const questScore = questMap[w] || 0;
            return {
              week: `Week ${w}`,
              reportScore,
              questScore,
              totalScore: reportScore + questScore,
            };
          }).sort((a, b) => {
            const n1 = parseInt(a.week.split(" ")[1]);
            const n2 = parseInt(b.week.split(" ")[1]);
            return n1 - n2;
          });

          setScores(combined);
        }
      } catch (error) {
        console.error("🔥 Error fetching data:", error);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className={`profile-container ${userData?.gender === "female" ? "female-bg" : "male-bg"}`}>
      <div className="profile-card">
        {userData?.photo ? (
          <img src={userData.photo} alt="Profile" className="profile-photo" />
        ) : (
          <div className="profile-placeholder">😎</div>
        )}

        <h1 className="profile-name">{userData?.name}</h1>
        <p className="profile-email">{userData?.email}</p>

        <div className="profile-info">
          <div className="info-item">
            <span className="label">Role:</span>
            <span className="value">{userData?.role || "No role assigned"}</span>
          </div>

          <div className="info-item">
            <span className="label">Team:</span>
            <span className="value">{userData?.teamKey || "No team assigned"}</span>
          </div>

          <div className="info-item">
            <span className="label">Grade:</span>
            <span className="value">{userData?.grade?.replace(/_/g, " ")}</span>
          </div>
        </div>

        {userData?.role === "user" && (
          <div className="weekly-scores">
            <h3>Your Scores</h3>
            {scores.length === 0 ? (
              <p>No scores available yet.</p>
            ) : (
              <ul>
                {scores.map(({ week, reportScore, questScore, totalScore }, i) => (
                  <li key={i}>
                    <strong>{week}:</strong> Report: {reportScore}  Quests: {questScore}  Total: {totalScore}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

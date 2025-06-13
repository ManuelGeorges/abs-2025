"use client";

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
        // تجيب بيانات اليوزر
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          setUserData(null);
          setLoading(false);
          return;
        }

        const userInfo = userSnap.data();
        setUserData(userInfo);

        // لو الrole مش user ما يعرضش الدرجات
        if (userInfo.role === "user") {
          // تجيب التقارير المعتمدة بس لليوزر ده
          const reportsQuery = query(
            collection(db, "reports"),
            where("userId", "==", user.uid),
            where("approved", "==", true)
          );
          const reportsSnapshot = await getDocs(reportsQuery);

          const userScores = reportsSnapshot.docs.map((doc) => {
            const data = doc.data();
            // خذ رقم الأسبوع من الحقل weekNumber مباشرة
            const weekNum = data.weekNumber || "Unknown Week";
            return {
              week: `Week ${weekNum}`,
              score: data.score || 0,
            };
          });

          setScores(userScores);
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
    <div
      className={`profile-container ${
        userData?.gender === "female" ? "female-bg" : "male-bg"
      }`}
    >
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
                {scores.map(({ week, score }, i) => (
                  <li key={i}>
                    <strong>{week}:</strong> {score} points
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

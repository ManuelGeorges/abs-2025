"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import "./idb.css";

export default function DirectorDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const router = useRouter();

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
        const usersData = usersSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // فلترة اليوزرز اللي role بتاعهم "user" فقط
        const filteredUsers = usersData.filter((user) => user.role === "user");

        setUsers(filteredUsers);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching users:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [userRole]);

  if (loading) return <div className="loading">Loading...</div>;

  const groupedByTeam = users.reduce((acc, user) => {
    if (!acc[user.teamKey]) acc[user.teamKey] = [];
    acc[user.teamKey].push(user);
    return acc;
  }, {});

  return (
    <div className="director-container">
      <h1>Director Dashboard - Users Only</h1>

      {Object.keys(groupedByTeam).map((teamKey) => (
        <div className="team-card" key={teamKey}>
          <h2>Team: {teamKey}</h2>
          {groupedByTeam[teamKey].map((user) => (
            <div className="report-card" key={user.id}>
              <h3>{user.name || user.username}</h3>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Gender:</strong> {user.gender}</p>
              <p><strong>Grade:</strong> {user.grade}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

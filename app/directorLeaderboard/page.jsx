'use client';

import React, { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import './page.css';

export default function DirectorLeaderboardPage() {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [availableWeeks, setAvailableWeeks] = useState([]);

  useEffect(() => {
    const today = new Date();
    const startDate = new Date('2025-06-13');
    const tempWeeks = [];

    for (let i = 0; i < 7; i++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(startDate.getDate() + i * 7);
      if (today >= weekStart) tempWeeks.push(i + 1);
    }

    setAvailableWeeks(tempWeeks);
  }, []);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUserId(user.uid);
        const docRef = doc(db, 'users', user.uid);
        const snap = await getDoc(docRef);
        const data = snap.data();
        setUserRole(data?.role || null);
      } else {
        setCurrentUserId(null);
        setUserRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedWeek) return;

    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const reportsRef = collection(db, 'reports');
        const questRef = collection(db, 'questScores');

        const reportsQuery = query(reportsRef, where('weekNumber', '==', Number(selectedWeek)));
        const reportsSnap = await getDocs(reportsQuery);

        const questStart = new Date('2025-06-13');
        const startOfWeek = new Date(questStart);
        startOfWeek.setDate(startOfWeek.getDate() + (selectedWeek - 1) * 7);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);

        const questSnap = await getDocs(questRef);

        const questScores = {};
        questSnap.forEach((doc) => {
          const data = doc.data();
          const date = new Date(data.date);
          if (date >= startOfWeek && date <= endOfWeek) {
            if (!questScores[data.userId]) questScores[data.userId] = 0;
            questScores[data.userId] += Number(data.score || 0);
          }
        });

        const tempData = {};
        reportsSnap.forEach((doc) => {
          const data = doc.data();
          const userId = data.userId;
          if (!tempData[userId]) {
            tempData[userId] = {
              userId,
              reportScore: Number(data.score) || 0,
              questScore: 0,
            };
          } else {
            tempData[userId].reportScore = Number(data.score) || 0;
          }
        });

        Object.keys(questScores).forEach((userId) => {
          if (!tempData[userId]) {
            tempData[userId] = {
              userId,
              reportScore: 0,
              questScore: questScores[userId],
            };
          } else {
            tempData[userId].questScore = questScores[userId];
          }
        });

        const allUserIds = Object.keys(tempData);

        const usersMap = {};
        function chunkArray(array, size) {
          const chunks = [];
          for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
          }
          return chunks;
        }

        const chunks = chunkArray(allUserIds, 10);
        for (const chunk of chunks) {
          const q = query(collection(db, 'users'), where('__name__', 'in', chunk));
          const snap = await getDocs(q);
          snap.forEach((doc) => {
            const data = doc.data();
            usersMap[doc.id] = {
              name: data.name ?? 'No Name',
              teamKey: data.teamKey ?? 'No Team',
            };
          });
        }

        const finalData = allUserIds.map((userId) => ({
          userId,
          userName: usersMap[userId]?.name || 'No Name',
          userTeam: usersMap[userId]?.teamKey || 'No Team',
          reportScore: tempData[userId].reportScore,
          questScore: tempData[userId].questScore,
          totalScore: (tempData[userId].reportScore || 0) + (tempData[userId].questScore || 0),
        }));

        finalData.sort((a, b) => {
          if (b.totalScore === a.totalScore) {
            return a.userName.localeCompare(b.userName);
          }
          return b.totalScore - a.totalScore;
        });

        const ranks = [];
        ranks[0] = 1;
        for (let i = 1; i < finalData.length; i++) {
          if (finalData[i].totalScore === finalData[i - 1].totalScore) {
            ranks[i] = ranks[i - 1];
          } else {
            ranks[i] = ranks[i - 1] + 1;
          }
        }

        finalData.forEach((item, index) => {
          item.rank = ranks[index];
        });

        setReportData(finalData);
      } catch (error) {
        console.error('❌ Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [selectedWeek]);

  function getRowClass(rank) {
    if (rank === 1) return 'gold';
    if (rank === 2) return 'silver';
    if (rank === 3) return 'bronze';
    return '';
  }

  if (userRole && userRole !== 'director') {
    return <p className="loading-text">⛔ Unauthorized - Directors only</p>;
  }

  return (
    <div className="leaderboard-container">
      <h2 className="leaderboard-title">🏆 Director Leaderboard</h2>

      <div className="week-selector">
        {availableWeeks.map((week) => (
          <button
            key={week}
            onClick={() => setSelectedWeek(week)}
            className={`week-btn ${selectedWeek === week ? 'selected' : ''}`}
          >
            Week {week}
          </button>
        ))}
      </div>

      {loading && <p className="loading-text">Loading leaderboard...</p>}

      {!loading && selectedWeek && reportData && reportData.length > 0 && (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th className='rank-header'>Rank</th>
              <th>Name</th>
              <th>Team</th>
              <th>Rep.</th>
              <th>Quests</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {reportData.map((player) => (
              <tr
                key={player.userId}
                className={`${getRowClass(player.rank)} ${player.userId === currentUserId ? 'highlight' : ''}`}
              >
                <td>{player.rank}</td>
                <td>{player.userName}{player.userId === currentUserId && ' ⭐'}</td>
                <td>{player.userTeam}</td>
                <td>{player.reportScore}</td>
                <td>{player.questScore}</td>
                <td>{player.totalScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && selectedWeek && reportData && reportData.length === 0 && (
        <p className="loading-text">No data for Week {selectedWeek}</p>
      )}
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import './page.css';

export default function LeaderboardPage() {
  const [currentUserId, setCurrentUserId] = useState(null);
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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUserId(user?.uid || null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedWeek === null) return;

    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const reportsRef = collection(db, 'reports');
        const questRef = collection(db, 'questScores');

        let reportsSnap, questSnap;

        if (selectedWeek === 'all') {
          reportsSnap = await getDocs(reportsRef);
          questSnap = await getDocs(questRef);
        } else {
          const reportsQuery = query(reportsRef, where('weekNumber', '==', Number(selectedWeek)));
          reportsSnap = await getDocs(reportsQuery);

          const questStart = new Date('2025-06-13');
          const startOfWeek = new Date(questStart);
          startOfWeek.setDate(startOfWeek.getDate() + (selectedWeek - 1) * 7);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(endOfWeek.getDate() + 6);
          
          questSnap = await getDocs(questRef);

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

          if (allUserIds.length > 0) {
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

          setReportData(finalData);
          setLoading(false);
          return;
        }

        const questScores = {};
        questSnap.forEach((doc) => {
          const data = doc.data();
          if (!questScores[data.userId]) questScores[data.userId] = 0;
          questScores[data.userId] += Number(data.score || 0);
        });

        const tempData = {};
        reportsSnap.forEach((doc) => {
          const data = doc.data();
          const userId = data.userId;
          if (!tempData[userId]) {
            tempData[userId] = {
              userId,
              reportScore: 0,
              questScore: 0,
            };
          }
          tempData[userId].reportScore += Number(data.score) || 0;
        });

        Object.keys(questScores).forEach((userId) => {
          if (!tempData[userId]) {
            tempData[userId] = {
              userId,
              reportScore: 0,
              questScore: 0,
            };
          }
          tempData[userId].questScore += questScores[userId];
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

        if (allUserIds.length > 0) {
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

        setReportData(finalData);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [selectedWeek]);

  function getDenseRanks(sortedData) {
    const ranks = [];
    if (sortedData.length > 0) {
      ranks[0] = 1;
      for (let i = 1; i < sortedData.length; i++) {
        if (sortedData[i].totalScore === sortedData[i - 1].totalScore) {
          ranks[i] = ranks[i - 1];
        } else {
          ranks[i] = ranks[i - 1] + 1;
        }
      }
    }
    return ranks;
  }

  function getRowClass(rank) {
    if (rank === 1) return 'gold';
    if (rank === 2) return 'silver';
    if (rank === 3) return 'bronze';
    return '';
  }

  const ranks = reportData ? getDenseRanks(reportData) : [];
  
  return (
    <div className="leaderboard-container">
      <h2 className="leaderboard-title">🏆 Leaderboard</h2>

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
        <button
          onClick={() => setSelectedWeek('all')}
          className={`week-btn ${selectedWeek === 'all' ? 'selected' : ''}`}
        >
          All
        </button>
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
            {reportData.map((player, index) => (
              <tr
                key={player.userId}
                className={`${getRowClass(ranks[index])} ${player.userId === currentUserId ? 'highlight' : ''}`}
              >
                <td>{ranks[index]}</td>
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
        <p className="loading-text">No data for {selectedWeek === 'all' ? 'all weeks' : `Week ل${selectedWeek}`}</p>
      )}
    </div>
  );
}
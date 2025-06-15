'use client';

import React, { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import './page.css';

export default function TeamLeaderboardPage() {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentTeamKey, setCurrentTeamKey] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);

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
        const usersSnapshot = await getDocs(
          query(collection(db, 'users'), where('__name__', '==', user.uid))
        );
        if (!usersSnapshot.empty) {
          const userData = usersSnapshot.docs[0].data();
          setCurrentTeamKey(userData.teamKey || null);
        } else {
          setCurrentTeamKey(null);
        }
      } else {
        setCurrentUserId(null);
        setCurrentTeamKey(null);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentTeamKey || !selectedWeek) return;

    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const usersRef = collection(db, 'users');
        const usersQuery = query(
          usersRef,
          where('teamKey', '==', currentTeamKey),
          where('role', '==', 'user') // ✅ الشرط اللي بيعرض اليوزر بس
        );
        const usersSnap = await getDocs(usersQuery);

        const userIds = usersSnap.docs.map(doc => doc.id);
        const userIdToName = {};
        usersSnap.forEach(doc => {
          const data = doc.data();
          userIdToName[doc.id] = data.name || 'No Name';
        });

        const reportsRef = collection(db, 'reports');
        const reportsQuery = query(
          reportsRef,
          where('weekNumber', '==', Number(selectedWeek)),
          where('userId', 'in', userIds)
        );
        const reportsSnap = await getDocs(reportsQuery);

        const questRef = collection(db, 'questScores');
        const questSnap = await getDocs(questRef);

        const questScores = {};
        const questStart = new Date('2025-06-13');
        const startOfWeek = new Date(questStart);
        startOfWeek.setDate(startOfWeek.getDate() + (selectedWeek - 1) * 7);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);

        questSnap.forEach(doc => {
          const data = doc.data();
          const date = new Date(data.date);
          if (date >= startOfWeek && date <= endOfWeek && userIds.includes(data.userId)) {
            if (!questScores[data.userId]) questScores[data.userId] = 0;
            questScores[data.userId] += Number(data.score || 0);
          }
        });

        const tempData = {};
        userIds.forEach(userId => {
          tempData[userId] = {
            userId,
            reportScore: 0,
            questScore: 0,
          };
        });

        reportsSnap.forEach(doc => {
          const data = doc.data();
          const userId = data.userId;
          tempData[userId].reportScore = Number(data.score) || 0;
        });

        Object.keys(questScores).forEach(userId => {
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

        const finalData = Object.keys(tempData).map(userId => ({
          userId,
          userName: userIdToName[userId] || 'No Name',
          userTeam: currentTeamKey,
          reportScore: tempData[userId].reportScore,
          questScore: tempData[userId].questScore,
          totalScore: (tempData[userId].reportScore || 0) + (tempData[userId].questScore || 0),
        }));

        finalData.sort((a, b) => b.totalScore - a.totalScore);

        setReportData(finalData);
      } catch (error) {
        console.error('❌ Error fetching team leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [currentTeamKey, selectedWeek]);

  function getDenseRanks(sortedData) {
    const ranks = [];
    ranks[0] = 1;
    for (let i = 1; i < sortedData.length; i++) {
      if (sortedData[i].totalScore === sortedData[i - 1].totalScore) {
        ranks[i] = ranks[i - 1];
      } else {
        ranks[i] = ranks[i - 1] + 1;
      }
    }
    return ranks;
  }

  const ranks = reportData ? getDenseRanks(reportData) : [];
  const displayedData = reportData
    ? reportData.map((entry, index) => ({ ...entry, rank: ranks[index] }))
    : [];

  function getRowClass(rank) {
    if (rank === 1) return 'gold';
    if (rank === 2) return 'silver';
    if (rank === 3) return 'bronze';
    return '';
  }

  return (
    <div className="leaderboard-container">
      <h2 className="leaderboard-title">🏅 Team {currentTeamKey} Leaderboard</h2>

      <div className="week-selector">
        {availableWeeks.map(week => (
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

      {!loading && selectedWeek && displayedData && displayedData.length > 0 && (
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
            {displayedData.map(player => (
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

      {!loading && selectedWeek && displayedData && displayedData.length === 0 && (
        <p className="loading-text">No data for Week {selectedWeek}</p>
      )}
    </div>
  );
}

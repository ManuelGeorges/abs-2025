'use client';

import React, { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import './page.css';

export default function LeaderboardPage() {
  const [currentEmail, setCurrentEmail] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [availableWeeks, setAvailableWeeks] = useState([]);

  useEffect(() => {
    const today = new Date();
    const startDate = new Date('2025-06-20');
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
      setCurrentEmail(user ? user.email : null);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedWeek || !currentEmail) return;

    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const reportsRef = collection(db, 'reports');
        const reportsQuery = query(
          reportsRef,
          where('approved', '==', true),
          where('weekNumber', '==', Number(selectedWeek))
        );

        const snapshot = await getDocs(reportsQuery);

        let scores = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          scores.push({
            userEmail: data.email ?? 'unknown@email.com',
            userName: data.username ?? 'No Name',
            userTeam: data.teamKey ?? 'No Team',
            totalScore: Number(data.score) || 0,
          });
        });

        scores.sort((a, b) => b.totalScore - a.totalScore);
        setReportData(scores);
      } catch (error) {
        console.error('❌ Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [selectedWeek, currentEmail]);

  function getRanks(scores) {
    const ranks = [];
    let currentRank = 1;
    ranks[0] = currentRank;

    for (let i = 1; i < scores.length; i++) {
      if (scores[i].totalScore === scores[i - 1].totalScore) {
        ranks[i] = currentRank;
      } else {
        currentRank = i + 1;
        ranks[i] = currentRank;
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
      </div>

      {loading && <p className="loading-text">Loading leaderboard...</p>}

      {!loading && selectedWeek && reportData && reportData.length > 0 && (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              <th>Team</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {reportData.map((player, idx) => {
              const rank = getRanks(reportData)[idx];
              return (
                <tr
                  key={player.userEmail}
                  className={`${getRowClass(rank)} ${
                    player.userEmail === currentEmail ? 'highlight' : ''
                  }`}
                >
                  <td>{rank}</td>
                  <td>
                    {player.userName}
                    {player.userEmail === currentEmail && ' ⭐'}
                  </td>
                  <td>{player.userTeam}</td>
                  <td>{player.totalScore}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {!loading && selectedWeek && reportData && reportData.length === 0 && (
        <p className="loading-text">No data for Week {selectedWeek}</p>
      )}
    </div>
  );
}

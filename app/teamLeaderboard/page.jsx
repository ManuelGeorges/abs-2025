'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import './page.css';

export default function TeamLeaderboardPage() {
  const [currentEmail, setCurrentEmail] = useState(null);
  const [currentTeamKey, setCurrentTeamKey] = useState(null);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(1);

  const START_DATE = new Date('2025-06-20'); // تاريخ بداية الأسبوع الأول

  const isWeekAvailable = (week) => {
    const now = new Date();
    const weekStart = new Date(START_DATE);
    weekStart.setDate(weekStart.getDate() + (week - 1) * 7);
    return now >= weekStart;
  };

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentEmail(user.email);
        const usersSnapshot = await getDocs(
          query(collection(db, 'users'), where('email', '==', user.email))
        );
        if (!usersSnapshot.empty) {
          const userData = usersSnapshot.docs[0].data();
          setCurrentTeamKey(userData.teamKey || null);
        }
      } else {
        setCurrentEmail(null);
        setCurrentTeamKey(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentTeamKey || !selectedWeek) return;

    async function fetchLeaderboard() {
      setLoading(true);
      try {
        const usersSnapshot = await getDocs(
          query(collection(db, 'users'), where('teamKey', '==', currentTeamKey))
        );

        let tempScores = [];

        for (const userDoc of usersSnapshot.docs) {
          const userData = userDoc.data();
          if (userData.role !== 'user') continue;

          const userEmail = userData.email;
          const userName = userData.name || 'No Name';

          const reportsQuery = query(
            collection(db, 'reports'),
            where('email', '==', userEmail),
            where('approved', '==', true),
            where('week', '==', selectedWeek)
          );
          const reportsSnapshot = await getDocs(reportsQuery);

          let totalScore = 0;
          reportsSnapshot.forEach((reportDoc) => {
            totalScore += reportDoc.data().score || 0;
          });

          tempScores.push({ userEmail, userName, totalScore, userTeam: currentTeamKey });
        }

        tempScores.sort((a, b) => b.totalScore - a.totalScore);
        setScores(tempScores);
      } catch (err) {
        console.error('🔥 Error fetching leaderboard:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, [currentTeamKey, selectedWeek]);

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

  const ranks = getRanks(scores);
  const topThree = scores.slice(0, 3);
  const topThreeRanks = ranks.slice(0, 3);
  const currentUserIndex = currentEmail ? scores.findIndex(player => player.userEmail === currentEmail) : -1;
  const currentUserData = currentUserIndex !== -1 ? scores[currentUserIndex] : null;
  const currentUserRank = currentUserIndex !== -1 ? ranks[currentUserIndex] : null;
  const isInTopThree = currentUserIndex >= 0 && currentUserIndex < 3;

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
        {[1, 2, 3, 4, 5, 6, 7].map(week => (
          <button
            key={week}
            onClick={() => setSelectedWeek(week)}
            className={`week-button ${week === selectedWeek ? 'active-week' : ''}`}
            disabled={!isWeekAvailable(week)}
          >
            Week {week}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="loading-text">Loading leaderboard...</p>
      ) : (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Name</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {topThree.map((player, idx) => (
              <tr
                key={player.userEmail}
                className={`${getRowClass(topThreeRanks[idx])} ${player.userEmail === currentEmail ? 'highlight' : ''}`}
              >
                <td>{topThreeRanks[idx]}</td>
                <td>{player.userName} {player.userEmail === currentEmail && '(you)'}</td>
                <td>{player.totalScore}</td>
              </tr>
            ))}

            {!isInTopThree && currentUserData && (
              <>
                <tr className="spacer-row"><td colSpan="4"></td></tr>
                <tr className="highlight">
                  <td>{currentUserRank}</td>
                  <td>{currentUserData.userName} <span className='you'>(You)</span></td>
                  <td>{currentUserData.totalScore}</td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

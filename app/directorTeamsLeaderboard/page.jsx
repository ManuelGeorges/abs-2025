'use client';

import React, { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import './page.css';

export default function TeamLeaderboardPage() {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [availableWeeks, setAvailableWeeks] = useState([]);

  const teamNames = {
    'HeavenlyJerusalem': 'أورشليم السماوية',
    'Philadelphia': 'فيلادلفيا',
    'Smyrna': 'سميرنا',
    'Sardis': 'ساردس',
    'Ephesus': 'أفسس',
    'Thyatira': 'ثياتيرا',
    'Pergamos': 'برغامس',
    'Laodicea': 'لاودكية',
  };

  function getArabicTeamName(teamKey) {
    return teamNames[teamKey] || teamKey;
  }

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
    if (selectedWeek === null) return;

    const fetchTeamLeaderboard = async () => {
      setLoading(true);
      try {
        const reportsRef = collection(db, 'teamScores');
        let reportsQuery;

        if (selectedWeek === 'all') {
          reportsQuery = reportsRef;
        } else {
          reportsQuery = query(reportsRef, where('week', '==', Number(selectedWeek)));
        }

        const snapshot = await getDocs(reportsQuery);
        const teamMap = {};

        snapshot.forEach((doc) => {
          const data = doc.data();
          const teamKey = data.teamKey;
          if (!teamMap[teamKey]) {
            teamMap[teamKey] = {
              teamKey,
              totalScore: 0,
              examScore: 0,
              tasksScore: 0,
              luckWheelScore: 0,
            };
          }
          teamMap[teamKey].totalScore += data.totalScore;
          teamMap[teamKey].examScore += data.examScore;
          teamMap[teamKey].tasksScore += data.tasksScore;
          teamMap[teamKey].luckWheelScore += data.luckScore || 0;
        });

        const teamArray = Object.values(teamMap);
        teamArray.sort((a, b) => b.totalScore - a.totalScore);
        setTeamData(teamArray);
      } catch (error) {
        console.error('❌ Error fetching team leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamLeaderboard();
  }, [selectedWeek]);

  function getRanks(scores) {
    if (!scores || scores.length === 0) return [];
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

  if (userRole && userRole !== 'director') {
    return <p className="loading-text">⛔ Unauthorized - Directors only</p>;
  }

  const ranks = getRanks(teamData);

  return (
    <div className="leaderboard-container">
      <h2 className="leaderboard-title">🏆 Teams Leaderboard</h2>

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

      {loading && <p className="loading-text">Loading team leaderboard...</p>}

      {!loading && selectedWeek && teamData && teamData.length > 0 && (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team</th>
              <th>Total</th>
              <th>Exam</th>
              <th>Tasks</th>
              <th>Luck Wheel</th>
            </tr>
          </thead>
          <tbody>
            {teamData.map((team, idx) => (
              <tr key={team.teamKey} className={getRowClass(ranks[idx])}>
                <td>{ranks[idx]}</td>
                <td>{getArabicTeamName(team.teamKey)}</td>
                <td>{team.totalScore}</td>
                <td>{team.examScore}</td>
                <td>{team.tasksScore}</td>
                <td>{team.luckWheelScore ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && selectedWeek && teamData && teamData.length === 0 && (
        <p className="no-data">No team data for {selectedWeek === 'all' ? 'all weeks' : `Week ${selectedWeek}`}</p>
      )}
    </div>
  );
}
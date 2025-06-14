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

  // تحديد الأسابيع المتاحة بناءً على تاريخ البداية (زي الليدربورد الكبير)
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

  // جلب المستخدم الحالي وتحديد الـteamKey بتاعه
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUserId(user.uid);

        // جلب بيانات المستخدم عشان نجيب teamKey
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

  // جلب بيانات leaderboard للفريق فقط
  useEffect(() => {
    if (!currentTeamKey || !selectedWeek) return;

    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        // جلب كل المستخدمين في الفريق
        const usersRef = collection(db, 'users');
        const usersQuery = query(usersRef, where('teamKey', '==', currentTeamKey));
        const usersSnap = await getDocs(usersQuery);

        const userIds = usersSnap.docs.map(doc => doc.id);
        const userIdToName = {};
        usersSnap.forEach(doc => {
          const data = doc.data();
          userIdToName[doc.id] = data.name || 'No Name';
        });

        // جلب تقارير الأسبوع المحدد لهؤلاء المستخدمين فقط
        const reportsRef = collection(db, 'reports');
        const reportsQuery = query(
          reportsRef,
          where('weekNumber', '==', Number(selectedWeek)),
          where('userId', 'in', userIds)
        );
        const reportsSnap = await getDocs(reportsQuery);

        // جلب نتائج المهمات (quests) لنفس المستخدمين ونفس الأسبوع
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

        // دمج نتائج التقارير والمهام
        const tempData = {};
        reportsSnap.forEach(doc => {
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

        // تحضير البيانات النهائية للعرض
        const finalData = Object.keys(tempData).map(userId => ({
          userId,
          userName: userIdToName[userId] || 'No Name',
          userTeam: currentTeamKey,
          reportScore: tempData[userId].reportScore,
          questScore: tempData[userId].questScore,
          totalScore: (tempData[userId].reportScore || 0) + (tempData[userId].questScore || 0),
        }));

        // ترتيب حسب المجموع الكلي (تنازلي)
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

  // ترتيب dense ranking بالظبط زي الليدربورد الكبير
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

  // فلترة عرض top3 + المستخدم الحالي
  function filterTop3WithUser(data, currentUserId) {
    if (!data) return [];

    const ranks = getDenseRanks(data);
    let top3 = [];
    let currentUserEntry = null;

    for (let i = 0; i < data.length; i++) {
      if (ranks[i] <= 3) {
        top3.push({ ...data[i], rank: ranks[i] });
      }
      if (data[i].userId === currentUserId) {
        currentUserEntry = { ...data[i], rank: ranks[i] };
      }
    }

    const userInTop3 = top3.some((entry) => entry.userId === currentUserId);
    if (!userInTop3 && currentUserEntry) {
      top3.push(currentUserEntry);
    }

    return top3;
  }

  function getRowClass(rank) {
    if (rank === 1) return 'gold';
    if (rank === 2) return 'silver';
    if (rank === 3) return 'bronze';
    return '';
  }

  const displayedData = filterTop3WithUser(reportData, currentUserId);

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
              <th>Rep. </th>
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

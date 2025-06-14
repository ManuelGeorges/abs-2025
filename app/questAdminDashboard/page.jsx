'use client';

import React, { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import './page.css';

export default function QuestAdminPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [users, setUsers] = useState([]);
  const [responses, setResponses] = useState({});

  useEffect(() => {
    async function fetchUsers() {
      const q = query(collection(db, 'users'), where('role', '==', 'user'));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setUsers(list);
    }
    fetchUsers();
  }, []);

  useEffect(() => {
    async function fetchResponses() {
      const q = query(
        collection(db, 'questScores'),
        where('date', '==', selectedDate)
      );
      const snapshot = await getDocs(q);
      const data = {};
      snapshot.forEach((doc) => {
        const d = doc.data();
        data[d.userId] = d.answer;
      });
      setResponses(data);
    }
    fetchResponses();
  }, [selectedDate]);

  const handleAnswer = async (userId, answer, name, teamKey) => {
    const prevAnswer = responses[userId];
    const scoreDocRef = doc(db, 'questScores', `${userId}_${selectedDate}`);

    if (prevAnswer === 'yes' && answer === 'yes') {
      await deleteDoc(scoreDocRef);
      setResponses((prev) => ({ ...prev, [userId]: '' }));
      return;
    }

    let scoreChange = 0;
    if (prevAnswer !== 'yes' && answer === 'yes') {
      scoreChange = 10;
    } else if (prevAnswer === 'yes' && answer !== 'yes') {
      scoreChange = -10;
    }

    const existingScoreSnap = await getDoc(scoreDocRef);
    let existingData = existingScoreSnap.exists() ? existingScoreSnap.data() : {};
    let newScore = (existingData.score || 0) + scoreChange;

    await setDoc(scoreDocRef, {
      userId,
      name,
      teamKey,
      date: selectedDate,
      answer: answer === 'yes' ? 'yes' : '',
      score: newScore,
      updatedAt: new Date().toISOString(),
    });

    setResponses((prev) => ({ ...prev, [userId]: answer }));
  };

  return (
    <div className="quest-dashboard">
      <h2>Who participated in today's quest?</h2>
      <label>
        Choose a day:
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </label>
      <table className="quest-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Answer</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>
                <div className="answer-buttons">
                  <button
                    className={responses[user.id] === 'yes' ? 'selected yes' : ''}
                    onClick={() => handleAnswer(user.id, 'yes', user.name, user.teamKey)}
                  >
                    Yes
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
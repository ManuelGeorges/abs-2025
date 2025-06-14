"use client";

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  addDoc
} from 'firebase/firestore';
import './tdb.css';

const WEEK_NUMBERS = [1, 2, 3, 4, 5, 6, 7];
const ALL_TEAMS = [
  'Ephesus', 'Thyatira', 'Laodicea', 'Pergamos',
  'Smyrna', 'Philadelphia', 'Sardis', 'HeavenlyJerusalem'
];

const TEAM_NAMES = {
  Ephesus: 'أفسس',
  Thyatira: 'ثياتيرا',
  Laodicea: 'لاودكية',
  Pergamos: 'برغامس',
  Smyrna: 'سميرنا',
  Philadelphia: 'فيلادلفيا',
  Sardis: 'ساردس',
  HeavenlyJerusalem: 'أورشليم السمائية',
};

const isWeekEnabled = (weekNumber) => {
  const startDate = new Date('2025-06-01');
  const now = new Date();
  const weekDate = new Date(startDate);
  weekDate.setDate(startDate.getDate() + (weekNumber - 1) * 7);
  return now >= weekDate;
};

export default function DirectorDashboard() {
  const [week, setWeek] = useState(1);
  const [teamScores, setTeamScores] = useState({});
  const [saveMessage, setSaveMessage] = useState('');
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchTeamScores = async () => {
      if (!isWeekEnabled(week)) {
        setTeamScores({});
        return;
      }

      const q = query(collection(db, 'teamScores'), where('week', '==', week));
      const querySnapshot = await getDocs(q);
      const data = {};
      querySnapshot.forEach((docSnap) => {
        const docData = docSnap.data();
        data[docData.teamKey] = {
          examScore: docData.examScore ?? '',
          tasksScore: docData.tasksScore ?? '',
        };
      });

      ALL_TEAMS.forEach((team) => {
        if (!data[team]) {
          data[team] = { examScore: '', tasksScore: '' };
        }
      });

      setTeamScores(data);

      // ✅ جلب المستخدمين
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersList = usersSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log("📦 All users from Firestore:", usersList); // Debug
      setUsers(usersList);
    };

    fetchTeamScores();
  }, [week]);

  const handleChange = (teamKey, field, value) => {
    setTeamScores((prev) => ({
      ...prev,
      [teamKey]: {
        ...prev[teamKey],
        [field]: value,
      },
    }));
  };

  const handleSave = async (teamKey) => {
    try {
      const exam = Number(teamScores[teamKey]?.examScore) || 0;
      const tasks = Number(teamScores[teamKey]?.tasksScore) || 0;
      const total = exam + tasks;

      const q = query(
        collection(db, 'teamScores'),
        where('teamKey', '==', teamKey),
        where('week', '==', week)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docRef = doc(db, 'teamScores', querySnapshot.docs[0].id);
        await updateDoc(docRef, {
          examScore: exam,
          tasksScore: tasks,
          totalScore: total,
        });
      } else {
        const newDoc = {
          teamKey,
          week,
          examScore: exam,
          tasksScore: tasks,
          totalScore: total,
        };
        await addDoc(collection(db, 'teamScores'), newDoc);
      }
      setSaveMessage(`تم حفظ درجات فريق ${TEAM_NAMES[teamKey]} بنجاح!`);
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error("Error saving document:", error);
      setSaveMessage("حصل خطأ أثناء الحفظ، حاول مرة تانية.");
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  return (
    <div className="dashboard-container">
      <h1 className="title">Director Team Scores Dashboard</h1>

      <div className="week-navbar">
        {WEEK_NUMBERS.map((num) => (
          <button
            key={num}
            onClick={() => isWeekEnabled(num) && setWeek(num)}
            className={`week-button ${week === num ? 'active' : ''}`}
            disabled={!isWeekEnabled(num)}
          >
            Week {num}
          </button>
        ))}
      </div>

      {saveMessage && (
        <div className="save-message">
          {saveMessage}
        </div>
      )}

      {isWeekEnabled(week) ? (
        <div className="team-scores">
          {ALL_TEAMS.map((teamKey) => (
            <div key={teamKey} className="team-card">
              <div className="team-title">{TEAM_NAMES[teamKey]}</div>
              <div className="input-row">
                <div className="input-group">
                  <label>Exam Score</label>
                  <input
                    type="number"
                    value={teamScores[teamKey]?.examScore ?? ''}
                    onChange={(e) => handleChange(teamKey, 'examScore', e.target.value || '')}
                  />
                </div>
                <div className="input-group">
                  <label>Tasks Score</label>
                  <input
                    type="number"
                    value={teamScores[teamKey]?.tasksScore ?? ''}
                    onChange={(e) => handleChange(teamKey, 'tasksScore', e.target.value || '')}
                  />
                </div>
                <button
                  className="save-button"
                  onClick={() => handleSave(teamKey)}
                >
                  Save
                </button>
              </div>

              {/* ✅ عرض كل أعضاء الفريق سواء user أو teamLeader */}
              <div className="team-users">
                <h4>Team Members:</h4>
                {users.filter((u) => u.teamKey === teamKey).length === 0 ? (
                  <p style={{ color: '#999' }}>No users found in this team.</p>
                ) : (
                  <ul>
                    {users
                      .filter((u) => u.teamKey === teamKey)
                      .map((u) => (
                        <li key={u.id}>
                          <strong>{u.username || 'No Username'}</strong> - {u.email} - {u.grade} - {u.gender} - {u.role}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ textAlign: 'center', marginTop: '20px', color: '#555' }}>
          No week is activated until now.
        </p>
      )}
    </div>
  );
}

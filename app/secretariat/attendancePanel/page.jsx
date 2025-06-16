'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import './page.css';

export default function AttendancePanelPage() {
  const [users, setUsers] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedType, setSelectedType] = useState('lecture');

  // 1. Load users with role 'user'
  useEffect(() => {
    const fetchUsers = async () => {
      const q = query(collection(db, 'users'), where('role', '==', 'user'));
      const snapshot = await getDocs(q);
      const fetchedUsers = snapshot.docs.map((doc) => ({
        ...doc.data(),
        uid: doc.id,
      }));
      const sortedUsers = fetchedUsers.sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setUsers(sortedUsers);
    };
    fetchUsers();
  }, []);

  // 2. Load attendance for selected week/type
  useEffect(() => {
    const fetchAttendance = async () => {
      const attendanceData = {};
      const attendanceSnapshot = await getDocs(
        query(
          collection(db, 'attendances')
        )
      );
      attendanceSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.week === selectedWeek && data.type === selectedType) {
          attendanceData[data.email] = true;
        }
      });
      setAttendance(attendanceData);
    };

    if (users.length > 0) fetchAttendance();
  }, [users, selectedWeek, selectedType]);

  // 3. Toggle attendance manually
  const toggleAttendance = async (user) => {
    const docId = `${user.email}_week${selectedWeek}_${selectedType}`;
    const docRef = doc(db, 'attendances', docId);

    if (attendance[user.email]) {
      await deleteDoc(docRef);
      setAttendance((prev) => ({
        ...prev,
        [user.email]: false,
      }));
    } else {
      await setDoc(docRef, {
        email: user.email,
        name: user.name,
        uid: user.uid,
        week: selectedWeek,
        type: selectedType,
        timestamp: new Date(),
      });
      setAttendance((prev) => ({
        ...prev,
        [user.email]: true,
      }));
    }
  };

  return (
    <div className="container">
      <h1>Attendance Panel</h1>

      <div className="filter-bar">
        <select
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(Number(e.target.value))}
        >
          {[1, 2, 3, 4, 5, 6, 7].map((week) => (
            <option key={week} value={week}>
              Week {week} (starts {13 + (week - 1) * 7} June)
            </option>
          ))}
        </select>

        <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
          <option value="lecture">Lecture</option>
          <option value="competition">Competition</option>
        </select>
      </div>

      <table className="attendance-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Attended</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.email}>
              <td>{user.name}</td>
              <td
                className={
                  attendance[user.email] ? 'status-yes' : 'status-no'
                }
                onClick={() => toggleAttendance(user)}
              >
                {attendance[user.email] ? 'Yes' : 'No'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

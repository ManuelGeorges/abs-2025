'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import {
  addDoc,
  collection,
  serverTimestamp,
  getDoc,
  doc,
  updateDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import './page.css';

export default function AttendanceControlPage() {
  const [week, setWeek] = useState(1);
  const [type, setType] = useState('lecture');
  const [status, setStatus] = useState('');
  const [allowed, setAllowed] = useState(false);
  const [currentDocId, setCurrentDocId] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ التحقق من الصلاحية + وجود جلسة حضور مفتوحة
  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists() && userSnap.data().role === 'secretariat') {
          setAllowed(true);

          // ✅ التحقق من وجود جلسة حضور مفعّلة حاليًا
          const q = query(collection(db, 'attendanceWindows'), where('active', '==', true));
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const activeDoc = snapshot.docs[0];
            setCurrentDocId(activeDoc.id);
            const data = activeDoc.data();
            setWeek(data.week);
            setType(data.type);
            setStatus('✅ Attendance window is currently active.');
          }
        } else {
          setStatus('🚫 You are not authorized to access this page.');
        }
      }
    });
  }, []);

  const handleClick = async () => {
    setLoading(true);
    try {
      if (!currentDocId) {
        // ✅ فتح جلسة حضور جديدة
        const docRef = await addDoc(collection(db, 'attendanceWindows'), {
          week,
          type,
          startTime: new Date(),
          active: true,
          createdAt: serverTimestamp(),
        });
        setCurrentDocId(docRef.id);
        setStatus('✅ Attendance window started.');
      } else {
        // ✅ غلق الجلسة
        const windowRef = doc(db, 'attendanceWindows', currentDocId);
        await updateDoc(windowRef, {
          endTime: new Date(),
          active: false,
        });
        setCurrentDocId(null);
        setStatus('✅ Attendance window ended.');
      }
    } catch (error) {
      console.error(error);
      setStatus('❌ Something went wrong.');
    }
    setLoading(false);
  };

  if (!allowed) return <div className="flex-center"><p>{status || 'Checking permissions...'}</p></div>;

  return (
    <div className="attend-container">
      <div className="attend-card">
        <h2>🕘 Attendance Session</h2>

        <div className="attend-field">
          <label>📅 Week</label>
          <input
            type="number"
            value={week}
            onChange={(e) => setWeek(Number(e.target.value))}
            min={1}
            max={20}
          />
        </div>

        <div className="attend-field">
          <label>🎯 Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="lecture">Lecture</option>
            <option value="competition">Competition</option>
          </select>
        </div>

        <button
          onClick={handleClick}
          className={`attend-button ${currentDocId ? 'end' : 'start'}`}
          disabled={loading}
        >
          {loading
            ? 'Processing...'
            : currentDocId
            ? '⏹️ End Attendance'
            : '▶️ Start Attendance'}
        </button>

        {status && <p className="attend-status">{status}</p>}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { db, auth } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import './page.css';

export default function AttendPage() {
    console.log('🎬 AttendPage component rendered');

  const [status, setStatus] = useState('Checking attendance status...');
  const [statusType, setStatusType] = useState('loading'); // success | error | info | loading
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const checkAndMarkAttendance = async () => {
      try {
        onAuthStateChanged(auth, async (user) => {
          console.log('🔍 onAuthStateChanged triggered');
          if (!user) {
            console.log('❌ No user logged in');
            setStatus('❌ You must be logged in.');
            setStatusType('error');
            return;
          }

          const uid = user.uid;
          console.log('👤 User UID:', uid);

          // Get user info
          const userRef = doc(db, 'users', uid);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            console.log('❌ User document not found');
            setStatus('❌ User data not found.');
            setStatusType('error');
            return;
          }

          const userInfo = userSnap.data();
          setUserData(userInfo);
          console.log('✅ User info:', userInfo);

          // Get active attendance window (based on "active: true")
          const windowsQuery = query(
            collection(db, 'attendanceWindows'),
            where('active', '==', true)
          );
          const windowSnapshot = await getDocs(windowsQuery);

          if (windowSnapshot.empty) {
            console.log('❌ No active attendance window found');
            setStatus('❌ No active attendance window right now.');
            setStatusType('info');
            return;
          }

          const activeWindow = windowSnapshot.docs[0];
          const { week, type } = activeWindow.data();
          console.log('✅ Active window found:', { week, type });

          // Check if already attended
          const attendanceQuery = query(
            collection(db, 'attendances'),
            where('uid', '==', uid),
            where('week', '==', week),
            where('type', '==', type)
          );
          const attendanceSnapshot = await getDocs(attendanceQuery);

          if (!attendanceSnapshot.empty) {
            console.log('✅ Already marked attendance');
            setStatus('✅ You have already marked attendance.');
            setStatusType('success');
            return;
          }

          // Mark attendance
          await addDoc(collection(db, 'attendances'), {
            uid,
            email: userInfo.email,
            name: userInfo.name || '',
            week,
            type,
            timestamp: serverTimestamp(),
          });

          console.log('✅ Attendance marked successfully!');
          setStatus(`✅ Attendance marked successfully for ${type} (Week ${week})`);
          setStatusType('success');
        });
      } catch (err) {
        console.error('🔥 Error occurred:', err);
        setStatus('❌ An unexpected error occurred.');
        setStatusType('error');
      }
    };

    checkAndMarkAttendance();
  }, []);

  return (
    <div className="attend-wrapper">
      <div className="attend-card">
        <h1>📝 Mark Attendance</h1>
        <div className={`attend-status ${statusType}`}>
          {status}
        </div>
        {userData && (
          <div className="attend-user">
            Logged in as: <strong>{userData.name}</strong>
          </div>
        )}
      </div>
    </div>
  );
}

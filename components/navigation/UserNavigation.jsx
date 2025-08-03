'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import './navigation.css';

export default function UserNavigation() {
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      }
    });

    return () => unsubscribe();
  }, []);

  if (!userData) return null;

  const { role, teamKey } = userData;

  return (
    <div>
      {/* Top Navigation */}
      <nav className="top-nav">
        {(role === 'quest-admin' || role === 'secretariat') && (
          <Link href="/leaderboard">L.B</Link>
        )}

        {role === 'director' && (
          <>
            <Link href="/directorLeaderboard">L.B</Link>
            <Link href="/directorTeamsLeaderboard">Teams L.B</Link>
          </>
        )}

        {role !== 'director' && (
          <Link href="/teamsLeaderboard">Teams L.B</Link>
        )}

        {role === 'user' && <Link href="/teamLeaderboard">Friends L.B</Link>}

        {/* Links for both director and secretariat */}
        {(role === 'director' || role === 'secretariat') && (
          <>
            <Link href="/secretariat/Qr-code">Qr Code</Link>
            <Link href="/secretariat/attendancePanel">At.panelt</Link>
          </>
        )}
      </nav>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <Link href="/profile">Profile</Link>

        {role === 'user' && (
          <Link href="/weekly-report">Weekly Report</Link>
        )}

        {role === 'teamLeader' && (
          <Link href="/teamLeaderDashboard">Team DB</Link>
        )}

        {role === 'director' && (
          <>
            <Link href="/directorIndividualDashboard">People DB</Link>
            <Link href="/directorTeamsDashboard">Teams DB</Link>
          </>
        )}

        {role === 'quest-admin' && (
          <Link href="/questAdminDashboard">Questions DB</Link>
        )}

        {role === 'secretariat' && (
          <>
            <Link href="/secretariat/Qr-code">QR Code</Link>
            <Link href="/secretariat/attendancePanel">Att. Panel</Link>
          </>
        )}
      </nav>
    </div>
  );
}
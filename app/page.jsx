"use client";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useRouter } from "next/navigation";

export default function Home() {
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    router.replace("/profile");
  }, [router]);

  return null; // أو لو حابب تحط loading indicator
}

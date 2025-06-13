// app/layout.jsx
import "./globals.css"; // لو عندك CSS عام
import UserNavigation from "@/components/navigation/UserNavigation";

export const metadata = {
  title: "ABS 2025",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <UserNavigation />
        <main style={{ paddingBottom: "60px", paddingTop: "20px" }}>
          {children}
        </main>
      </body>
    </html>
  );
}

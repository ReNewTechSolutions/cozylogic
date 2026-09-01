// src/app/layout.tsx
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata = {
  title: "CozyLogic",
  description: "AI room redesigns in minutes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}

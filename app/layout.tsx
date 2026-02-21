// app/layout.tsx
import "./globals.css";

export const metadata = {
  title: "CozyLogic",
  description: "AI-assisted room redesigns with calm, budget-aware guidance.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
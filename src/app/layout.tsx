import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Business Lifeline | Business MRI",
  description: "Diagnose business pressure and build a practical 90-day rescue plan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

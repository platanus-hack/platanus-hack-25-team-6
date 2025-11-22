import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Senior Wellness Platform",
  description: "AI-powered wellness companion for seniors",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}

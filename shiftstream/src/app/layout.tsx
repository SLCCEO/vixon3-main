import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShiftStream | Vexon Studio",
  description: "Private Twitch schedule and Google Calendar workspace.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

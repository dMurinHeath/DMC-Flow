import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DMC Flow",
  description:
    "A calm, accountable task manager built around My Flow, project boards and evidence-based Flow Gate reviews.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

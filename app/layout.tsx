import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://buildwithpartha.tech"),
  title: "Build with Partha",
  description: "Build with Partha - Practical ideas, thoughtful products, and useful things.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Build with Partha",
    description: "Practical ideas, thoughtful products, and useful things.",
    url: "https://buildwithpartha.tech",
    siteName: "Build with Partha",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Build with Partha",
    description: "Practical ideas, thoughtful products, and useful things.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}

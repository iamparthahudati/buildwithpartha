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
  title: "Coming Soon | Build with Partha",
  description:
    "Build with Partha is launching soon. Practical ideas, thoughtful products, and useful things for builders.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Coming Soon | Build with Partha",
    description: "Practical ideas, thoughtful products, and useful things are taking shape.",
    url: "https://buildwithpartha.tech",
    siteName: "Build with Partha",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1680,
        height: 945,
        alt: "Build with Partha — Coming soon.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Coming Soon | Build with Partha",
    description: "Practical ideas, thoughtful products, and useful things are taking shape.",
    images: ["/og.png"],
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

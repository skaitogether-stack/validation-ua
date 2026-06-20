import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "../components/Providers";
import { Header } from "../components/Header";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Validation UA",
  description: "Освітня платформа для вивчення різних предметів, проходження тестів та тренування",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="uk"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <Header />
          <div className="flex-1">
            {children}
          </div>
          <footer className="py-4 text-center">
            <Link
              href="/ai-calculator"
              className="text-[10px] text-gray-300/30 hover:text-gray-500/50 transition-colors select-none"
              tabIndex={-1}
            >
              •
            </Link>
          </footer>
        </Providers>
      </body>
    </html>
  );
}

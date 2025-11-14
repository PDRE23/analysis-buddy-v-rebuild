import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "B² (Bsquared) - Lease Analysis Tool",
  description: "Professional lease analysis tool for tenant-rep real estate professionals - I wish there were 2 of me",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded focus:outline-none"
          >
            Skip to main content
          </a>
          <div className="min-h-screen flex flex-col bg-background text-foreground">
            <main id="main-content" role="main" className="flex-1">
              {children}
            </main>
            <footer className="py-4 text-center text-xs text-muted-foreground">
              Created by Peyton Dowd
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}

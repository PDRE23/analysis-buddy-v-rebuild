'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-blue-900 to-background text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-16 lg:px-12">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              B<span className="align-top text-2xl">²</span>
            </h1>
            <p className="mt-2 text-sm text-blue-200">
              The Broker Tool Built By Brokers
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild variant="secondary">
              <Link href="/login">Log In</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </header>

        <main className="flex flex-1 flex-col-reverse items-center justify-center gap-12 py-16 text-center md:flex-row md:text-left">
          <div className="max-w-2xl space-y-6">
            <p className="text-lg uppercase tracking-[0.35em] text-blue-300">
              Modern Lease Analysis Platform
            </p>
            <h2 className="text-4xl font-extrabold leading-tight sm:text-5xl">
              Win more tenant-rep deals with collaborative insights, client-ready
              reports, and AI-powered modeling—all in one workspace.
            </h2>
            <p className="text-lg text-blue-100">
              From pipeline tracking to financial modeling, B² keeps every broker
              aligned, on brand, and ready to impress clients at every touchpoint.
            </p>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-start">
              <Button asChild size="lg">
                <Link href="/signup">Create an Account</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/login">I already have an account</Link>
              </Button>
            </div>
          </div>
          <div className="relative w-full max-w-xl">
            <div className="rounded-3xl border border-blue-400/40 bg-white/10 p-6 shadow-xl backdrop-blur">
              <div className="space-y-4 text-left text-sm text-blue-100">
                <p className="text-base font-semibold text-white">
                  What you get with B²
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                    Live deal dashboards with per-client insights and reminders.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                    AI-assisted summaries, proposal comparisons, and risk alerts.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                    Client-ready exports, presentation mode, and shareable
                    portals.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                    Built by tenant-rep brokers for the workflows you already use.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

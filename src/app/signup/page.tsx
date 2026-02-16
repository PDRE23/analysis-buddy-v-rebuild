"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SignupPage() {
  const router = useRouter();
  const { signUp, loading, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/app");
    }
  }, [loading, user, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      await signUp({
        email,
        password,
        options: { data: { onboardingComplete: false } },
      });
      router.replace("/app");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create account. Try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0a1628] via-[#0f1f3d] to-[#0a1628] px-4 py-16 overflow-hidden">
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <Card className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl border border-white/20 rounded-2xl">
        <CardHeader className="space-y-2 text-center">
          <div className="flex justify-center mb-2">
            <div className="text-xl font-bold text-slate-900">
              B<span className="text-amber-500 align-top text-sm">²</span>
            </div>
          </div>
          <CardTitle className="text-3xl font-extrabold text-slate-900">
            Join B<span className="text-amber-500 align-top text-xl">²</span>
          </CardTitle>
          <p className="text-sm text-slate-500">
            The broker tool built by brokers—create your account in seconds.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-600" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label
                className="text-sm font-medium text-slate-600"
                htmlFor="password"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label
                className="text-sm font-medium text-slate-600"
                htmlFor="confirm-password"
              >
                Confirm Password
              </label>
              <Input
                id="confirm-password"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full bg-[#162040] hover:bg-[#1e2d54] text-white shadow-lg hover:shadow-xl transition-all duration-200" disabled={submitting}>
              {submitting ? "Creating account..." : "Create Account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 text-sm text-slate-500">
          <p>
            Already have an account?{" "}
            <Link href="/login" className="text-amber-600 hover:text-amber-700 hover:underline font-medium">
              Log in here
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}


"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, loading, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/app");
    }
  }, [loading, user, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await signIn({ email, password });
      router.replace("/app");
    } catch (err) {
      // Don't show network errors to users - they're handled by fallback to local auth
      const errorMessage = err instanceof Error ? err.message : String(err);
      const isNetworkError = 
        errorMessage.toLowerCase().includes('fetch') ||
        errorMessage.toLowerCase().includes('network') ||
        errorMessage.toLowerCase().includes('failed to fetch') ||
        errorMessage.toLowerCase().includes('name_not_resolved') ||
        errorMessage.toLowerCase().includes('supabase unavailable');
      
      if (isNetworkError) {
        // Network errors are handled by fallback to local auth
        // If we get here, it means local auth also failed (invalid credentials)
        setError("Invalid email or password. Please try again.");
      } else {
        // Show other errors (like invalid credentials)
        setError(
          errorMessage.includes("Invalid login credentials") || 
          errorMessage.includes("Email not confirmed") ||
          errorMessage.includes("User not found")
            ? errorMessage
            : "Unable to sign in. Please try again."
        );
      }
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
            Welcome back to B<span className="text-amber-500 align-top text-xl">²</span>
          </CardTitle>
          <p className="text-sm text-slate-500">
            Sign in to continue managing your deals, analyses, and clients.
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
              <label className="text-sm font-medium text-slate-600" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full bg-[#162040] hover:bg-[#1e2d54] text-white shadow-lg hover:shadow-xl transition-all duration-200" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 text-sm text-slate-500">
          <p>
            Need an account?{" "}
            <Link href="/signup" className="text-amber-600 hover:text-amber-700 hover:underline font-medium">
              Create one here
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}


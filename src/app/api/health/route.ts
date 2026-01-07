import { NextResponse } from 'next/server';

export async function GET() {
  const health: {
    status: string;
    timestamp: string;
    service: string;
    version: string;
    environment: string;
    checks: {
      server: string;
      node: string;
      platform: string;
      memory: {
        used: number;
        total: number;
        unit: string;
      };
      supabase?: string;
      storage?: string;
    };
  } = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Analysis Buddy V2',
    version: process.env.npm_package_version || '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      server: 'running',
      node: process.version,
      platform: process.platform,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB',
      },
    },
  };

  // Check if Supabase is configured
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    health.checks.supabase = 'configured';
  } else {
    health.checks.supabase = 'not_configured';
    health.checks.storage = 'local';
  }

  return NextResponse.json(health, { status: 200 });
}


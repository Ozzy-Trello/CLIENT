import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const buildId =
      process.env.NEXT_PUBLIC_APP_BUILD_ID ||
      process.env.APP_BUILD_VERSION ||
      null;
    const version =
      process.env.NEXT_PUBLIC_APP_BUILD_VERSION ||
      process.env.npm_package_version ||
      '1.0.0';

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version,
      buildId,
    };

    const response = NextResponse.json(healthData, { status: 200 });
    if (buildId) {
      response.headers.set('X-App-Build', buildId);
    }
    return response;
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        timestamp: new Date().toISOString(),
        error: 'Health check failed' 
      }, 
      { status: 500 }
    );
  }
}

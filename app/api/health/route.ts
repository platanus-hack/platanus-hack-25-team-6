import { NextResponse } from 'next/server';
import { db } from '@/core/db';

export async function GET() {
  try {
    await db.connect();

    return NextResponse.json({
      status: 'ok',
      services: {
        database: db.isConnected() ? 'connected' : 'disconnected',
        storage: 'minio',
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

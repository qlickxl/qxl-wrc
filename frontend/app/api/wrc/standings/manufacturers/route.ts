import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4010';
    const { searchParams } = new URL(request.url);
    const season = searchParams.get('season') || '';
    const url = `${backendUrl}/api/wrc/standings/manufacturers${season ? `?season=${season}` : ''}`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Manufacturer standings proxy error:', error);
    return NextResponse.json([], { status: 500 });
  }
}

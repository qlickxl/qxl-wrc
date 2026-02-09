import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4010';
    const url = `${backendUrl}/api/wrc/rallies/${eventId}/stages`;
    const res = await fetch(url, { next: { revalidate: 300 } });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Rally stages proxy error:', error);
    return NextResponse.json([], { status: 500 });
  }
}

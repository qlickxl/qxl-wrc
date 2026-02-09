import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ stageId: string }> }
) {
  try {
    const { stageId } = await params;
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4010';
    const url = `${backendUrl}/api/wrc/stages/${stageId}/results`;
    const res = await fetch(url, { next: { revalidate: 60 } });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Stage results proxy error:', error);
    return NextResponse.json([], { status: 500 });
  }
}

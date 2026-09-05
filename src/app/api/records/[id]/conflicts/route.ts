import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/dataStore';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const store = getStore();

    const conflicts = await store.getConflictsByRecordId(id);

    return NextResponse.json({
      success: true,
      recordId: id,
      count: conflicts.length,
      data: conflicts,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/dataStore';
import { ConflictResolutionSchema } from '@/lib/validation/schemas';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conflictId } = await params;
    const body = await req.json();
    const validated = ConflictResolutionSchema.parse({
      ...body,
      conflictId,
    });

    const store = getStore();
    const resolved = await store.resolveConflict(
      conflictId,
      validated.resolutionNotes,
      'Dr. Clinical Reviewer'
    );

    if (!resolved) {
      return NextResponse.json({ success: false, error: 'Conflict not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: resolved });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Resolution failed' }, { status: 400 });
  }
}

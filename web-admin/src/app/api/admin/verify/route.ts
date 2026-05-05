import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const hash = searchParams.get('hash');
        if (!hash) return NextResponse.json({ found: false, error: 'No hash provided' }, { status: 400 });

        const identity = await db.findByLeafHash(hash);
        if (!identity) return NextResponse.json({ found: false });

        return NextResponse.json({
            found: true,
            public_name: identity.public_name,
            status: identity.status,
            is_revoked: identity.is_revoked,
        });
    } catch (err: any) {
        return NextResponse.json({ found: false, error: err.message }, { status: 500 });
    }
}

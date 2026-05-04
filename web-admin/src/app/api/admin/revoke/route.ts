import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { leafHash } = await req.json();
        if (!leafHash) return NextResponse.json({ success: false, error: 'No hash provided' }, { status: 400 });

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'undefined') {
            return NextResponse.json({ success: false, error: 'Database credentials missing' }, { status: 503 });
        }

        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseAnonKey);

        // TODO (groupmate): Two things need fixing here —
        // 1. verify/route.ts reads `is_revoked` (boolean) but this only sets `status: 'REVOKED'`.
        //    Add `is_revoked: true` to the update below so revoked citizens show correctly in verify.
        // 2. This only soft-revokes in Supabase. The on-chain Merkle tree is NOT updated.
        //    Call contract.revokeLicense(leafIndex, siblings) here to also remove from chain.
        //    ABI needed: "function revokeLicense(uint256 index, uint256[] calldata siblings) public"
        const { error } = await supabase
            .from('identities')
            .update({ status: 'REVOKED' }) // <-- also add: is_revoked: true
            .eq('leaf_hash', leafHash);

        if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

import { NextResponse } from "next/server";
import { getPlatformSnapshot } from "@/lib/platform-service";

export const runtime = "nodejs";

export async function GET() {
    try {
        const snapshot = await getPlatformSnapshot();
        return NextResponse.json(snapshot);
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Não foi possível carregar a plataforma." },
            { status: 500 },
        );
    }
}
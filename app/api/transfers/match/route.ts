import { NextResponse } from "next/server";
import { acceptMatch } from "@/lib/platform-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
    const body = (await request.json()) as {
        fromUnitId?: string;
        toUnitId?: string;
        medicineId?: string;
        quantity?: number;
        requestedBy?: string;
    };

    if (!body.fromUnitId || !body.toUnitId || !body.medicineId || !body.quantity) {
        return NextResponse.json({ message: "Payload de match inválido." }, { status: 400 });
    }

    try {
        const transfer = await acceptMatch({
            fromUnitId: body.fromUnitId,
            toUnitId: body.toUnitId,
            medicineId: body.medicineId,
            quantity: body.quantity,
            requestedBy: body.requestedBy,
        });

        return NextResponse.json(transfer, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { message: error instanceof Error ? error.message : "Não foi possível aceitar o match." },
            { status: 400 },
        );
    }
}
import { NextRequest, NextResponse } from "next/server";

const DIRECTUS_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const AUTH_TOKEN = process.env.DIRECTUS_STATIC_TOKEN || "";

export async function POST(req: NextRequest) {
    try {
        const { rfid } = await req.json();

        if (!rfid) {
            return NextResponse.json({ error: "RFID is required" }, { status: 400 });
        }

        // Search for user with matching RFID using Directus filter
        const query = new URLSearchParams({
            filter: JSON.stringify({
                rf_id: {
                    _eq: rfid
                }
            }),
            fields: "user_id,user_fname,user_lname,rf_id",
            limit: "1"
        });

        const response = await fetch(`${DIRECTUS_URL}/items/user?${query.toString()}`, {
            headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
        });

        if (!response.ok) {
            console.error("Directus lookup failed:", await response.text());
            return NextResponse.json({ error: "Failed to read database" }, { status: 500 });
        }

        const data = await response.json();

        if (!data.data || data.data.length === 0) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const user = data.data[0];
        return NextResponse.json({
            user_id: user.user_id,
            name: `${user.user_fname} ${user.user_lname}`,
            rfid: user.rf_id
        });

    } catch (error: any) {
        console.error("Error looking up RFID:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

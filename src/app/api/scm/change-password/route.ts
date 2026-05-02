import { NextRequest, NextResponse } from "next/server";
import { ChangePasswordSchema } from "@/modules/supply-chain-management/change-password/types/change-password.schema";
import { ChangePasswordService } from "@/modules/supply-chain-management/change-password/services/change-password-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/hrm/change-password
 * Handles password change requests by delegating to the ChangePasswordService.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // 1. Validate payload
        const validation = ChangePasswordSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Validation failed",
                    errors: validation.error.flatten().fieldErrors
                },
                { status: 400 }
            );
        }

        // 2. Call service
        const { oldPassword, newPassword } = validation.data;
        const result = await ChangePasswordService.changePassword({ oldPassword, newPassword });

        if (result.success) {
            return NextResponse.json(result);
        } else {
            return NextResponse.json(result, { status: 400 });
        }

    } catch (error) {
        console.error("Change Password API Error:", error);
        return NextResponse.json(
            { success: false, message: "An unexpected error occurred. Please try again later." },
            { status: 500 }
        );
    }
}

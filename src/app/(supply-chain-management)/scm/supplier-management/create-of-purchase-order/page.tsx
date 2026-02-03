import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";

import PurchaseOrderModule from "@/modules/supply-chain-management/supplier-management/create-of-purchase-order/PurchaseOrderModule";

export default async function CreatePurchaseOrderPage() {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    // Parse user data from cookie or use default
    const headerUser = userCookie
        ? JSON.parse(userCookie.value)
        : { name: "System Admin", role: "Internal Procurement", initials: "AD" };

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-blue-500/30">
            {/* STICKY HEADER */}
            <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-800/50 bg-[#09090b]/80 backdrop-blur-md px-6 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <Link
                        href="/scm/supplier-management"
                        className="p-2 hover:bg-zinc-800 rounded-md transition-all text-zinc-400 hover:text-white border border-transparent hover:border-zinc-700"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex flex-col">

                        <h1 className="text-lg font-black tracking-tight uppercase bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
                            Create Purchase Order
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Visual Separator */}
                    <div className="h-8 w-[1px] bg-zinc-800 mx-2" />

                    {/* User Display */}
                    <div className="flex items-center gap-3 px-2">
                        <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                                {headerUser.name}
                            </span>
                            <span className="text-[10px] text-zinc-500 font-medium">
                                {headerUser.role}
                            </span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                            {headerUser.initials}
                        </div>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <main className="p-4 md:p-8 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
                <PurchaseOrderModule />
            </main>
        </div>
    );
}
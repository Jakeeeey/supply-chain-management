import StockConversionModule from "@/modules/supply-chain-management/transfers/stock-conversion/StockConversionModule";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
<<<<<<< HEAD
import { NavUser } from "../../_components/nav-user";
=======
import { NavUser } from "@/components/shared/app-sidebar/nav-user";

>>>>>>> origin
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "vos_access_token";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const p = parts[1];
    const b64 = p.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function pickString(obj: Record<string, unknown> | null, keys: string[]): string {
<<<<<<< HEAD
  if (!obj) return "";
=======
>>>>>>> origin
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function toSafeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function buildHeaderUserFromToken(token: string | null | undefined): {
  id: number;
  branchId: number;
  name: string;
  email: string;
  avatar: string;
} {
  const payload = token ? decodeJwtPayload(token) : null;

  const first = pickString(payload, ["Firstname", "FirstName", "firstName", "firstname", "first_name"]);
  const last = pickString(payload, ["LastName", "Lastname", "lastName", "lastname", "last_name"]);
  const email = pickString(payload, ["email", "Email"]);

  const nameParts: string[] = [];
  if (first) nameParts.push(first);
  if (last) nameParts.push(last);
  const name = nameParts.length > 0 ? nameParts.join(" ") : email || "User";

  const branchId = toSafeNumber(
    payload?.branch_id ?? payload?.branchId ?? payload?.branch ?? 0
  );
  const id = toSafeNumber(
    payload?.id ?? payload?.userId ?? payload?.sub ?? 0
  );

  return {
    id: id > 0 ? id : 0,
    branchId: branchId > 0 ? branchId : 0,
    name: name || "User",
    email: email || "",
    avatar: "/avatars/shadcn.jpg",
  };
}

export default async function Page() {
  const cookieStore = await cookies();
  const token =
    cookieStore.get("springboot_token")?.value ??
    cookieStore.get(COOKIE_NAME)?.value ??
    null;

  const headerUser = buildHeaderUserFromToken(token);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header
        className="
          sticky top-2 z-50 relative
          flex h-16 shrink-0 items-center justify-between
          border-b bg-background
          before:content-[''] before:absolute before:inset-x-0 before:-top-2 before:h-2 before:bg-background
        "
      >
        <div className="flex h-full items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">Inventory Management</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage>Stock Conversion</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex h-full items-center px-4">
          <NavUser user={headerUser} />
        </div>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4">
          <StockConversionModule
            userId={headerUser.id}
            userBranchId={headerUser.branchId}
            userName={headerUser.name}
            userEmail={headerUser.email}
            userAvatar={headerUser.avatar}
          />
        </div>
      </ScrollArea>
    </div>
  );
<<<<<<< HEAD
}
=======
}

>>>>>>> origin

"use client";

import { PDPFilterProvider } from "@/modules/supply-chain-management/warehouse-management/consolidation/pre-dispatch-plan/context/PDPFilterContext";
import { ReactNode } from "react";

export default function PreDispatchPlanLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <PDPFilterProvider>{children}</PDPFilterProvider>;
}

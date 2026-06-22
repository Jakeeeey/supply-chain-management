import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ClusterGroupRaw, CustomerGroupRaw, SpringBootConsolidationOrder } from "@/modules/supply-chain-management/fleet-management/logistics-delivery/consolidation-summary/types";

// Environment variables
const SPRING_API_BASE_URL = process.env.SPRING_API_BASE_URL;

if (!SPRING_API_BASE_URL) {
  console.error("SPRING_API_BASE_URL is not defined");
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("vos_access_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract date filter parameters from frontend request
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    // Forward the date filters to Spring Boot API
    const apiUrl = `${SPRING_API_BASE_URL}/api/view-consolidation-so/filter?startDate=${startDate}&endDate=${endDate}&customerName=&salesmanName=&clusterName=&consolidatorNo=`;

    const response = await fetch(apiUrl, {
      cache: "no-store",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Spring Boot API Error: ${response.status} - ${errorText}`);
      throw new Error(`Spring Boot API returned status ${response.status}`);
    }

    const ordersData: SpringBootConsolidationOrder[] = await response.json();

    // Grouping logic to match the existing ClusterGroupRaw[] structure for the frontend
    const tempGroups: Record<string, { customers: Record<string, CustomerGroupRaw> }> = {};

    ordersData.forEach(order => {
      // Use fallback for null clusters
      const clusterName = order.clusterName || "Unassigned Cluster";
      const customerName = order.customerName || "Unknown Customer";
      const salesmanName = order.salesmanName || "Unknown Salesman";
      
      // Group by customer + salesman to prevent data loss if a customer has multiple salesmen
      const customerKey = `${customerName}||${salesmanName}`;

      if (!tempGroups[clusterName]) {
        tempGroups[clusterName] = { customers: {} };
      }

      if (!tempGroups[clusterName].customers[customerKey]) {
        tempGroups[clusterName].customers[customerKey] = {
          id: customerKey,
          customerName,
          salesmanName,
          orders: [],
        };
      }
      
      tempGroups[clusterName].customers[customerKey].orders.push(order);
    });

    const result: ClusterGroupRaw[] = Object.entries(tempGroups).map(([cName, groupData]) => ({
      clusterId: cName,
      clusterName: cName,
      customers: Object.values(groupData.customers),
    }));

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("Consolidation Summary API Error:", err);
    return NextResponse.json({ 
      error: "Failed to load Consolidation Summary", 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}

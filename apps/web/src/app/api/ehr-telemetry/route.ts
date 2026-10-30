import { NextResponse } from "next/server";
import { EHR_TELEMETRY } from "@/components/observability/ehr-data";

export async function GET() {
  // Return telemetry with live server timestamp
  const timestamp = new Date().toISOString();

  return NextResponse.json(
    {
      success: true,
      timestamp,
      region: "ap-south-1",
      stack: "EHR-backend",
      spendMtd: 0.42,
      spendCap: 4.80,
      nodes: EHR_TELEMETRY,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=5, stale-while-revalidate=10",
        "Content-Type": "application/json",
      },
    }
  );
}

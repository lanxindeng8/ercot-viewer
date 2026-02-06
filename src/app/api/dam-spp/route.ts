import { NextRequest, NextResponse } from "next/server";
import { queryDamLmpData } from "@/lib/influxdb";
import { SETTLEMENT_POINTS } from "@/lib/constants";
import { pivotDamData, getTomorrow } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || getTomorrow();

    const records = await queryDamLmpData(date, SETTLEMENT_POINTS);
    const pivoted = pivotDamData(records, SETTLEMENT_POINTS);

    return NextResponse.json({
      date,
      settlementPoints: SETTLEMENT_POINTS,
      data: pivoted,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching DAM SPP data:", error);
    return NextResponse.json(
      { error: "Failed to fetch DAM SPP data" },
      { status: 500 }
    );
  }
}

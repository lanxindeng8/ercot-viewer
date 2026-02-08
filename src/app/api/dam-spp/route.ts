import { NextRequest, NextResponse } from "next/server";
import { queryDamLmpData } from "@/lib/influxdb";
import { SETTLEMENT_POINTS } from "@/lib/constants";
import { pivotDamData, getTomorrow } from "@/lib/utils";

const PREDICTION_SERVICE_URL = process.env.PREDICTION_SERVICE_URL || "http://localhost:8001";

interface DamPrediction {
  hour_ending: string;
  predicted_price: number;
  timestamp: string;
}

interface PredictionResponse {
  status: string;
  settlement_point: string;
  delivery_date: string;
  predictions: DamPrediction[];
}

async function fetchPredictions(settlementPoint: string, date: string): Promise<Map<string, number>> {
  const predictions = new Map<string, number>();

  try {
    const url = `${PREDICTION_SERVICE_URL}/predictions/dam/next-day?settlement_point=${settlementPoint}&target_date=${date}`;
    const response = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (response.ok) {
      const data: PredictionResponse = await response.json();
      for (const pred of data.predictions) {
        // hour_ending is "01:00", "02:00", etc.
        predictions.set(pred.hour_ending, pred.predicted_price);
      }
    }
  } catch (error) {
    console.warn(`Failed to fetch predictions for ${settlementPoint}:`, error);
  }

  return predictions;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || getTomorrow();

    // Fetch actual prices
    const records = await queryDamLmpData(date, SETTLEMENT_POINTS);
    const pivoted = pivotDamData(records, SETTLEMENT_POINTS);

    // Fetch predictions for each settlement point (in parallel)
    const predictionPromises = SETTLEMENT_POINTS.map(async (point) => {
      const preds = await fetchPredictions(point, date);
      return { point, preds };
    });

    const predictionsResults = await Promise.all(predictionPromises);

    // Build predictions map: time -> { settlementPoint -> predictedPrice }
    const predictionsMap = new Map<string, Map<string, number>>();
    for (const { point, preds } of predictionsResults) {
      for (const [time, price] of preds) {
        if (!predictionsMap.has(time)) {
          predictionsMap.set(time, new Map());
        }
        predictionsMap.get(time)!.set(point, price);
      }
    }

    // Merge predictions into pivoted data
    const dataWithPredictions = pivoted.map((row) => {
      const timePreds = predictionsMap.get(row.time);
      const predictions: Record<string, number | null> = {};

      for (const point of SETTLEMENT_POINTS) {
        predictions[point] = timePreds?.get(point) ?? null;
      }

      return {
        ...row,
        predictions,
      };
    });

    return NextResponse.json({
      date,
      settlementPoints: SETTLEMENT_POINTS,
      data: dataWithPredictions,
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

import { DateTime } from "luxon";
import { ERCOT_TIMEZONE } from "./constants";

export function formatIntervalEnding(date: Date): string {
  const dt = DateTime.fromJSDate(date, { zone: "utc" }).setZone(ERCOT_TIMEZONE);
  return dt.toFormat("HHmm");
}

export function formatHourEnding(date: Date): number {
  const dt = DateTime.fromJSDate(date, { zone: "utc" }).setZone(ERCOT_TIMEZONE);
  return dt.hour === 0 ? 24 : dt.hour;
}

export function formatDate(date: Date): string {
  const dt = DateTime.fromJSDate(date, { zone: "utc" }).setZone(ERCOT_TIMEZONE);
  return dt.toFormat("MM/dd/yyyy");
}

export function getToday(): string {
  return DateTime.now().setZone(ERCOT_TIMEZONE).toFormat("yyyy-MM-dd");
}

export function getTomorrow(): string {
  return DateTime.now()
    .setZone(ERCOT_TIMEZONE)
    .plus({ days: 1 })
    .toFormat("yyyy-MM-dd");
}

export interface PivotedRow {
  operDay: string;
  interval: string | number;
  prices: Record<string, number | null>;
}

export function pivotRtmData(
  records: { time: Date; settlementPoint: string; lmp: number }[],
  settlementPoints: string[]
): PivotedRow[] {
  // Group by time
  const timeMap = new Map<string, Map<string, number>>();

  for (const record of records) {
    const timeKey = record.time.toISOString();
    if (!timeMap.has(timeKey)) {
      timeMap.set(timeKey, new Map());
    }
    timeMap.get(timeKey)!.set(record.settlementPoint, record.lmp);
  }

  // Convert to rows
  const rows: PivotedRow[] = [];
  const sortedTimes = Array.from(timeMap.keys()).sort();

  for (const timeKey of sortedTimes) {
    const date = new Date(timeKey);
    const priceMap = timeMap.get(timeKey)!;

    const prices: Record<string, number | null> = {};
    for (const point of settlementPoints) {
      prices[point] = priceMap.get(point) ?? null;
    }

    rows.push({
      operDay: formatDate(date),
      interval: formatIntervalEnding(date),
      prices,
    });
  }

  return rows;
}

export function pivotDamData(
  records: { time: Date; settlementPoint: string; lmp: number }[],
  settlementPoints: string[]
): PivotedRow[] {
  // Group by time
  const timeMap = new Map<string, Map<string, number>>();

  for (const record of records) {
    const timeKey = record.time.toISOString();
    if (!timeMap.has(timeKey)) {
      timeMap.set(timeKey, new Map());
    }
    timeMap.get(timeKey)!.set(record.settlementPoint, record.lmp);
  }

  // Convert to rows
  const rows: PivotedRow[] = [];
  const sortedTimes = Array.from(timeMap.keys()).sort();

  for (const timeKey of sortedTimes) {
    const date = new Date(timeKey);
    const priceMap = timeMap.get(timeKey)!;

    const prices: Record<string, number | null> = {};
    for (const point of settlementPoints) {
      prices[point] = priceMap.get(point) ?? null;
    }

    rows.push({
      operDay: formatDate(date),
      interval: formatHourEnding(date),
      prices,
    });
  }

  return rows;
}

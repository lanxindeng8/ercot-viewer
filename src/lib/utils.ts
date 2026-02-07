import { DateTime } from "luxon";
import { ERCOT_TIMEZONE } from "./constants";

export function formatTime(date: Date, includeMinutes: boolean = true): string {
  const dt = DateTime.fromJSDate(date, { zone: "utc" }).setZone(ERCOT_TIMEZONE);
  if (includeMinutes) {
    return dt.toFormat("HH:mm");
  }
  const hour = dt.hour === 0 ? 24 : dt.hour;
  return hour.toString().padStart(2, "0") + ":00";
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
  time: string;
  prices: Record<string, number | null>;
}

export function pivotRtmData(
  records: { time: Date; settlementPoint: string; lmp: number }[],
  settlementPoints: string[]
): PivotedRow[] {
  const timeMap = new Map<string, Map<string, number>>();

  for (const record of records) {
    const timeKey = record.time.toISOString();
    if (!timeMap.has(timeKey)) {
      timeMap.set(timeKey, new Map());
    }
    timeMap.get(timeKey)!.set(record.settlementPoint, record.lmp);
  }

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
      time: formatTime(date, true),
      prices,
    });
  }

  return rows;
}

export function pivotDamData(
  records: { time: Date; settlementPoint: string; lmp: number }[],
  settlementPoints: string[]
): PivotedRow[] {
  const timeMap = new Map<string, Map<string, number>>();

  for (const record of records) {
    const timeKey = record.time.toISOString();
    if (!timeMap.has(timeKey)) {
      timeMap.set(timeKey, new Map());
    }
    timeMap.get(timeKey)!.set(record.settlementPoint, record.lmp);
  }

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
      time: formatTime(date, false),
      prices,
    });
  }

  return rows;
}

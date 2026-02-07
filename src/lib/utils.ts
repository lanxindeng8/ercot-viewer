import { DateTime } from "luxon";
import { ERCOT_TIMEZONE } from "./constants";

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

// Generate all 5-minute intervals for RTM (00:05 to 24:00 = 288 intervals)
function generateRtmTimeSlots(): string[] {
  const slots: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let min = 5; min <= 60; min += 5) {
      if (min === 60) {
        // Hour ending format: 01:00, 02:00, etc. up to 24:00
        const displayHour = hour + 1;
        slots.push(displayHour.toString().padStart(2, "0") + ":00");
      } else {
        slots.push(hour.toString().padStart(2, "0") + ":" + min.toString().padStart(2, "0"));
      }
    }
  }
  return slots;
}

// Generate all hourly intervals for DAM (01:00 to 24:00 = 24 hours)
function generateDamTimeSlots(): string[] {
  const slots: string[] = [];
  for (let hour = 1; hour <= 24; hour++) {
    slots.push(hour.toString().padStart(2, "0") + ":00");
  }
  return slots;
}

// Convert record time to display time key for RTM (5-min intervals)
function toRtmTimeKey(date: Date): string {
  const dt = DateTime.fromJSDate(date, { zone: "utc" }).setZone(ERCOT_TIMEZONE);
  const hour = dt.hour;
  const min = dt.minute;

  if (min === 0) {
    // Midnight (00:00) maps to 24:00 of previous logical hour
    const displayHour = hour === 0 ? 24 : hour;
    return displayHour.toString().padStart(2, "0") + ":00";
  }
  return hour.toString().padStart(2, "0") + ":" + min.toString().padStart(2, "0");
}

// Convert record time to display time key for DAM (hourly)
function toDamTimeKey(date: Date): string {
  const dt = DateTime.fromJSDate(date, { zone: "utc" }).setZone(ERCOT_TIMEZONE);
  const hour = dt.hour === 0 ? 24 : dt.hour;
  return hour.toString().padStart(2, "0") + ":00";
}

export function pivotRtmData(
  records: { time: Date; settlementPoint: string; lmp: number }[],
  settlementPoints: string[]
): PivotedRow[] {
  // Build map of existing data keyed by time string
  const dataMap = new Map<string, Map<string, number>>();

  for (const record of records) {
    const timeKey = toRtmTimeKey(record.time);
    if (!dataMap.has(timeKey)) {
      dataMap.set(timeKey, new Map());
    }
    dataMap.get(timeKey)!.set(record.settlementPoint, record.lmp);
  }

  // Generate all time slots and fill with data or null
  const allSlots = generateRtmTimeSlots();
  const rows: PivotedRow[] = [];

  for (const slot of allSlots) {
    const priceMap = dataMap.get(slot);
    const prices: Record<string, number | null> = {};

    for (const point of settlementPoints) {
      prices[point] = priceMap?.get(point) ?? null;
    }

    rows.push({ time: slot, prices });
  }

  return rows;
}

export function pivotDamData(
  records: { time: Date; settlementPoint: string; lmp: number }[],
  settlementPoints: string[]
): PivotedRow[] {
  // Build map of existing data keyed by time string
  const dataMap = new Map<string, Map<string, number>>();

  for (const record of records) {
    const timeKey = toDamTimeKey(record.time);
    if (!dataMap.has(timeKey)) {
      dataMap.set(timeKey, new Map());
    }
    dataMap.get(timeKey)!.set(record.settlementPoint, record.lmp);
  }

  // Generate all time slots and fill with data or null
  const allSlots = generateDamTimeSlots();
  const rows: PivotedRow[] = [];

  for (const slot of allSlots) {
    const priceMap = dataMap.get(slot);
    const prices: Record<string, number | null> = {};

    for (const point of settlementPoints) {
      prices[point] = priceMap?.get(point) ?? null;
    }

    rows.push({ time: slot, prices });
  }

  return rows;
}

import { InfluxDBClient } from "@influxdata/influxdb3-client";

let client: InfluxDBClient | null = null;

function getClient(): InfluxDBClient {
  if (!client) {
    const host = process.env.INFLUXDB_URL;
    const token = process.env.INFLUXDB_TOKEN;
    const database = process.env.INFLUXDB_DATABASE;

    if (!host || !token || !database) {
      throw new Error(
        "Missing InfluxDB configuration. Set INFLUXDB_URL, INFLUXDB_TOKEN, and INFLUXDB_DATABASE."
      );
    }

    client = new InfluxDBClient({ host, token, database });
  }
  return client;
}

export interface RtmLmpRecord {
  time: Date;
  settlementPoint: string;
  lmp: number;
}

export interface DamLmpRecord {
  time: Date;
  settlementPoint: string;
  lmp: number;
}

export async function queryRtmLmpData(
  date: string,
  settlementPoints: string[]
): Promise<RtmLmpRecord[]> {
  const client = getClient();
  const pointsFilter = settlementPoints.map((p) => `'${p}'`).join(", ");

  const query = `
    SELECT time, settlement_point, lmp
    FROM "rtm_lmp"
    WHERE time >= '${date}T00:00:00Z'
      AND time < '${date}T23:59:59Z'
      AND settlement_point IN (${pointsFilter})
    ORDER BY time ASC
  `;

  const records: RtmLmpRecord[] = [];

  try {
    const result = await client.query(query);
    for await (const row of result) {
      records.push({
        time: new Date(row.time),
        settlementPoint: row.settlement_point,
        lmp: row.lmp,
      });
    }
  } catch (error) {
    console.error("Error querying RTM LMP data:", error);
    throw error;
  }

  return records;
}

export async function queryDamLmpData(
  date: string,
  settlementPoints: string[]
): Promise<DamLmpRecord[]> {
  const client = getClient();
  const pointsFilter = settlementPoints.map((p) => `'${p}'`).join(", ");

  const query = `
    SELECT time, settlement_point, lmp
    FROM "dam_lmp"
    WHERE time >= '${date}T00:00:00Z'
      AND time < '${date}T23:59:59Z'
      AND settlement_point IN (${pointsFilter})
    ORDER BY time ASC
  `;

  const records: DamLmpRecord[] = [];

  try {
    const result = await client.query(query);
    for await (const row of result) {
      records.push({
        time: new Date(row.time),
        settlementPoint: row.settlement_point,
        lmp: row.lmp,
      });
    }
  } catch (error) {
    console.error("Error querying DAM LMP data:", error);
    throw error;
  }

  return records;
}

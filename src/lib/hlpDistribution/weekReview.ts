import type { HlpDistributionRow } from "./types";
import type { RowCommentMap, RowStatusMap } from "@/lib/types";

const OLDER_WEEK_COMMENT = "rättningar?";

interface IsoWeek {
  /** ISO week-year */
  year: number;
  week: number;
}

/**
 * Flag rows from an older week than the newest week in the file.
 * Latest week = max ISO week among rows with a valid Avgångsdatum.
 */
export function flagOlderWeekRows(rows: HlpDistributionRow[]): {
  rowStatus: RowStatusMap;
  rowComments: RowCommentMap;
} {
  const rowStatus: RowStatusMap = {};
  const rowComments: RowCommentMap = {};

  let latest: IsoWeek | null = null;
  const weekByRowId = new Map<string, IsoWeek>();

  for (const row of rows) {
    const week = isoWeekFromIsoDate(row.avgangsdatum);
    if (!week) continue;
    weekByRowId.set(row.id, week);
    if (!latest || compareIsoWeeks(week, latest) > 0) {
      latest = week;
    }
  }

  if (!latest) {
    return { rowStatus, rowComments };
  }

  for (const row of rows) {
    const week = weekByRowId.get(row.id);
    if (!week) continue;
    if (compareIsoWeeks(week, latest) < 0) {
      rowStatus[row.id] = "check";
      rowComments[row.id] = OLDER_WEEK_COMMENT;
    }
  }

  return { rowStatus, rowComments };
}

/** Parse YYYY-MM-DD → ISO week-year + week number. */
function isoWeekFromIsoDate(dateStr: string): IsoWeek | null {
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return null;

  // ISO: Thursday determines week-year; week starts Monday.
  const dayUtc = date.getUTCDay() || 7; // Mon=1 … Sun=7
  date.setUTCDate(date.getUTCDate() + 4 - dayUtc);
  const isoYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7
  );

  return { year: isoYear, week };
}

/** Negative if a < b, 0 if equal, positive if a > b. */
function compareIsoWeeks(a: IsoWeek, b: IsoWeek): number {
  if (a.year !== b.year) return a.year - b.year;
  return a.week - b.week;
}

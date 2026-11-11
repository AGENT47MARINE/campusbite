export const CURRENT_STUDENT_ID = "S001";

export function formatSlot(time: string): string {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(time);
  if (!match) throw new Error(`Invalid pickup time: ${time}`);

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = hours >= 12 ? "pm" : "am";
  const displayHour = hours % 12 || 12;

  return `${displayHour}:${String(minutes).padStart(2, "0")} ${period}`;
}

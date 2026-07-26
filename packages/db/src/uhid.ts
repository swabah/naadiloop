const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function uhidFromPatientId(patientId: string): string {
  if (!UUID_PATTERN.test(patientId)) {
    throw new Error("A valid Patient UUID is required to generate a UHID.");
  }

  const hexadecimal = patientId.replaceAll("-", "").toUpperCase();
  return `UHID-${hexadecimal.slice(-10)}`;
}

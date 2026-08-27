/**
 * Utility to clean and format teacher names
 * Fixes double/repeated words and produces clean compact versions for small calendar cards.
 */

export function getCleanTeacherName(name: string | null | undefined): string {
  if (!name) return "Sin profesor";
  const words = name.trim().split(/\s+/);
  const cleanWords: string[] = [];

  for (let i = 0; i < words.length; i++) {
    // If the word sequence repeats (e.g. [A, B, A, B, C, D] or [A, A])
    if (cleanWords.length > 0 && cleanWords[cleanWords.length - 1].toLowerCase() === words[i].toLowerCase()) {
      continue;
    }
    cleanWords.push(words[i]);
  }

  // Check 2-word phrase repetitions (e.g., "Edison Darley Edison Darley")
  if (
    cleanWords.length >= 4 &&
    cleanWords[0].toLowerCase() === cleanWords[2].toLowerCase() &&
    cleanWords[1].toLowerCase() === cleanWords[3].toLowerCase()
  ) {
    cleanWords.splice(2, 2);
  }

  return cleanWords.join(" ");
}

export function getCompactTeacherName(name: string | null | undefined): string {
  const clean = getCleanTeacherName(name);
  if (clean === "Sin profesor") return clean;

  const parts = clean.split(/\s+/);
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return clean;

  // e.g. ["Edison", "Darley", "Suarez", "Rios"] -> "Edison Suarez"
  const firstName = parts[0];
  const firstLastName = parts.length >= 3 ? parts[2] : parts[1];
  return `${firstName} ${firstLastName}`;
}

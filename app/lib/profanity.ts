const BLOCKED_WORDS = [
  "ass", "asshole", "bastard", "bitch", "bollocks", "bullshit",
  "clit", "cock", "coon", "crap", "cunt", "damn", "dick", "dildo",
  "dyke", "fag", "faggot", "fuck", "goddamn", "handjob", "hell",
  "homo", "jerk", "kike", "lesbo", "milf", "motherfucker", "nazi",
  "negro", "nigga", "nigger", "piss", "prick", "pussy", "queer",
  "rape", "retard", "scrotum", "sex", "shit", "slut", "smegma",
  "spic", "tit", "tits", "twat", "vagina", "wank", "wanker",
  "whore",
];

const BLOCKED_SET = new Set(BLOCKED_WORDS);

const LEET_MAP: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "@": "a", "!": "i", "$": "s",
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[0-9@!$]/g, (ch) => LEET_MAP[ch] ?? ch)
    .replace(/[^a-z\s]/g, "");
}

export function containsProfanity(name: string): boolean {
  const normalized = normalize(name);
  const words = normalized.split(/\s+/);

  for (const word of words) {
    if (BLOCKED_SET.has(word)) return true;
  }

  const joined = words.join("");
  for (const blocked of BLOCKED_WORDS) {
    if (joined.includes(blocked)) return true;
  }

  return false;
}

export function validateDriverName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < 2) return "Name must be at least 2 characters";
  if (trimmed.length > 30) return "Name must be 30 characters or fewer";
  if (!/^[a-zA-Z\s\-'.]+$/.test(trimmed))
    return "Name can only contain letters, spaces, hyphens, and apostrophes";
  if (containsProfanity(trimmed)) return "Name contains inappropriate language";
  return null;
}

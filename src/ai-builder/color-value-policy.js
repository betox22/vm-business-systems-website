const NAMED_COLOR_ENTRIES = Object.freeze([
  [["azul electrico", "electric blue"], "#0066FF"],
  [["azul oscuro", "dark blue"], "#1E3A8A"],
  [["azul claro", "light blue"], "#60A5FA"],
  [["verde electrico", "electric green"], "#22C55E"],
  [["verde oscuro", "dark green"], "#166534"],
  [["verde claro", "light green"], "#86EFAC"],
  [["rojo electrico", "electric red"], "#EF233C"],
  [["rojo oscuro", "dark red"], "#991B1B"],
  [["rojo claro", "light red"], "#F87171"],
  [["morado electrico", "purpura electrico", "electric purple"], "#7C3AED"],
  [["morado oscuro", "purpura oscuro", "dark purple"], "#581C87"],
  [["morado claro", "purpura claro", "light purple"], "#C084FC"],
  [["amarillo electrico", "electric yellow"], "#FDE047"],
  [["amarillo oscuro", "dark yellow"], "#A16207"],
  [["amarillo claro", "light yellow"], "#FEF08A"],
  [["naranja electrico", "electric orange"], "#FF6B00"],
  [["naranja oscuro", "dark orange"], "#C2410C"],
  [["naranja claro", "light orange"], "#FDBA74"],
  [["rosa electrico", "rosado electrico", "electric pink", "hot pink"], "#EC4899"],
  [["rosa oscuro", "rosado oscuro", "dark pink"], "#9D174D"],
  [["rosa claro", "rosado claro", "light pink"], "#F9A8D4"],
  [["gris oscuro", "dark gray", "dark grey"], "#334155"],
  [["gris claro", "light gray", "light grey"], "#CBD5E1"],
  [["verde profundo", "verde elegante", "emerald", "esmeralda"], "#0F5E46"],
  [["azul confianza", "azul corporativo", "navy", "marino"], "#163B73"],
  [["rosa pastel", "pastel rosa", "rose", "rosado"], "#E8A7B8"],
  [["negro", "black", "oscuro", "noir"], "#111111"],
  [["blanco", "white"], "#FFFFFF"],
  [["dorado", "gold", "oro"], "#C89B3C"],
  [["plateado", "silver"], "#A8B0BA"],
  [["marfil", "ivory", "crema", "cream"], "#F7F1E7"],
  [["beige", "arena", "sand"], "#E8D9C5"],
  [["gris", "gray", "grey"], "#64748B"],
  [["marron", "cafe", "brown"], "#795548"],
  [["turquesa", "turquoise"], "#14B8A6"],
  [["cian", "cyan"], "#06B6D4"],
  [["magenta", "fucsia", "fuchsia"], "#D946EF"],
  [["coral"], "#F9736A"],
  [["verde", "natural", "botanico", "organico"], "#2F6F4E"],
  [["azul", "blue"], "#2563EB"],
  [["pastel", "soft"], "#F5D7E3"],
  [["rojo", "red"], "#B42318"],
  [["amarillo", "yellow"], "#EAB308"],
  [["naranja", "orange"], "#F97316"],
  [["rosa", "pink"], "#EC4899"],
  [["vino", "burgundy", "burdeos"], "#7A263A"],
  [["neon", "electrico"], "#39FF88"],
  [["morado", "purpura", "purple", "lila", "violeta", "violet"], "#6D4AFF"],
  [["minimalista", "minimal", "limpio"], "#F8FAFC"],
  [["lujo", "luxury", "premium"], "#14110F"],
]);

function normalizedColorText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function resolveColorValue(value, fallback = "") {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(raw)) return raw;
  if (/^(rgb|hsl)a?\(/i.test(raw)) return raw;

  const normalized = normalizedColorText(raw);
  const match = NAMED_COLOR_ENTRIES.find(([names]) => names.some((name) => normalized.includes(name)));
  return match?.[1] || fallback;
}

export function resolveColorValues(values) {
  const source = Array.isArray(values) ? values : values ? [values] : [];
  const resolved = [];
  const seen = new Set();

  source.forEach((value) => {
    const raw = String(value || "").trim();
    if (!raw) return;
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)) {
      const key = raw.toLowerCase();
      if (!seen.has(key)) resolved.push(raw);
      seen.add(key);
      return;
    }

    const normalized = normalizedColorText(raw);
    const matches = NAMED_COLOR_ENTRIES
      .flatMap(([names, color]) => names.map((name) => ({ name, color, index: normalized.indexOf(name) })))
      .filter((match) => match.index >= 0)
      .sort((first, second) => second.name.length - first.name.length);
    const occupiedRanges = [];
    matches.forEach(({ name, color, index }) => {
      const end = index + name.length;
      if (occupiedRanges.some(([start, occupiedEnd]) => index < occupiedEnd && end > start)) return;
      occupiedRanges.push([index, end]);
      const key = color.toLowerCase();
      if (!seen.has(key)) resolved.push(color);
      seen.add(key);
    });
  });

  return resolved;
}

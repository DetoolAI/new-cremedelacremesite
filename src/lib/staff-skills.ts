const RESTRICTIONS: Record<string, string[]> = {
  johana: [],
  mary: ["wax"],
  ana: [],
  zuly: [],
  angely: ["pedicure"],
};

const SERVICE_EXCLUSIONS: Record<string, string[]> = {
  // Ana,Johana,Mary,Zuly ONLY (NOT Angely) — no pedicure in name
  "russian gel manicure": ["angely"],
  "russian rubber overlay manicure": ["angely"],
  "russian builder gel overlay": ["angely"],
  "russian builder + mid nail art": ["angely"],
  "russian deep clean add-on": ["angely"],
  "regular manicure & pedicure": ["angely"],
  "reg mani & pedi": ["angely"],
  "regular manicure & ingrown": ["angely"],
  "reg manicure + callus remover pedi": ["angely"],
  "mani + pedi + 20min": ["angely"],
  "7 days essie twist mani + pedi": ["angely"],
  "gel mani + gel pedi": ["angely"],
  "gel mani + reg pedicure": ["angely"],
  "gel mani + 1 soak + reg pedi": ["angely"],
  "gel mani + 1 soak + gel pedi": ["angely"],
  "gel manicure + 2 soaks + gel pedicure": ["angely"],
  "gel mani + callus remover pedi": ["angely"],
  "gel mani + callus gel pedi": ["angely"],
  "spa deluxe pedi & reg mani": ["angely"],
  "spa premium gel pedi + gel mani": ["angely"],
  "$60 dazzle dry mani & pedi special": ["angely"],
  "dazzle dry mani & pedi + callus": ["angely"],
  "buff manicure + reg pedicure": ["angely"],
  "buff manicure + buff pedicure": ["angely"],
  "hard gel soak off + manicure + pedicure": ["angely"],
  "protein gel mani + reg pedi": ["angely"],
  "gel-x extensions (soft gel tips)": ["ana", "angely"],
  "gel-x (s-m) extensions + spa premium": ["ana", "angely"],
  "gel manicure + spa premium gel pedi combo": ["angely"],
  "russian protein gel mani + spa premium pedicure": ["angely"],
  "deluxe premium pedi soak + gel mani": ["angely"],
  "premium spa pedi soak + gel mani + soak": ["angely"],
  // Johana,Mary,Zuly ONLY (NOT Angely, NOT Ana)
  "acrylic full set": ["ana", "angely"],
  "baby boomer": ["angely", "ana"],
  "poly gel / hard gel full set": ["ana", "angely"],
  "russian manicure with hard or poly gel": ["angely", "ana"],
  "russian manicure with gel-x extensions": ["ana", "angely"],
  "gel-x full set + gel pedicure": ["ana", "angely"],
  "builder or acrylic overlay + nail art": ["ana", "angely"],
  // Johana,Mary ONLY (NOT Angely, NOT Ana, NOT Zuly)
  "acrylic soak / full set / art + reg pedi": ["ana", "zuly", "angely"],
  "acrylic cover fill + mid art + gel pedi": ["ana", "zuly", "angely"],
  "acrylic fill/full set + art + gel pedi": ["ana", "zuly", "angely"],
  "nude acrylic cover set": ["ana", "zuly", "angely"],
  "nude acrylic cover refill": ["ana", "zuly", "angely"],
  "acrylic full set + gel pedi + g soak": ["ana", "zuly", "angely"],
  "acrylic full-set + gel pedi": ["ana", "zuly", "angely"],
  "acrylic full-set": ["ana", "zuly", "angely"],
  "acrylic refill + gel pedi": ["ana", "zuly", "angely"],
  "acrylic refill + reg pedi": ["ana", "zuly", "angely"],
  "acrylic refill + spa pedi": ["ana", "zuly", "angely"],
  "acrylic refill + tired feet": ["ana", "zuly", "angely"],
  "acrylic refill + ingrown": ["ana", "zuly", "angely"],
  "acrylic refill russian": ["ana", "zuly", "angely"],
  "acrylic backfill russian manicure + gel pedi": ["ana", "zuly", "angely"],
  "ingrown gel pedi + gel mani + acrylic soak": ["ana", "zuly", "angely"],
  "ingrown callus gel pedi + gel mani": ["ana", "zuly", "angely"],
  "acrylic back fill (variable": ["ana", "zuly", "angely"],
  // Johana,Zuly,Mary ONLY (NOT Angely, NOT Ana)
  "russian manicure with acrylic": ["ana", "angely"],
  "russian builder gel with mid art + gel pedi": ["ana", "angely"],
  "russian builder gel overlay + callus gel pedi": ["ana", "angely"],
  "russian builder gel mani + cateye": ["ana", "angely"],
  "russian hard gel mani + russian gel pedi": ["ana", "angely"],
  "builder gel russian manicure + russian pedi": ["ana", "angely"],
  "russian builder overlay + spa premium gel pedi": ["ana", "angely"],
  "russian mani w/ builder gel + reg pedi": ["ana", "angely"],
  "russian gel mani + russian pedi": ["ana", "angely"],
  "russian gel mani & spa deluxe premium pedi": ["ana", "angely"],
  "gel-x extension russian manicure + gel pedi": ["ana", "angely"],
  "builder gel overlay + gel pedi": ["ana", "angely"],
  "builder gel overlay + reg pedi": ["ana", "angely"],
  "builder removal + overlay + gel pedi": ["ana", "angely"],
  "rubber/builder gel overlay + gel pedi + 1 g soak": ["ana", "angely"],
  "rubber/builder gel overlay + callus gel pedi": ["ana", "angely"],
  "rubber/builder gel overlay + ingrown reg pedi": ["ana", "angely"],
  "hard gel overlay + gel pedi": ["ana", "angely"],
  "powder gel / sns dip + gel pedicure + soak": ["ana", "angely"],
  "powder gel / sns dip + soak + spa pedicure": ["ana", "angely"],
  "powder gel / sns dip + soak + reg pedicure": ["ana", "angely"],
};

function firstNameKey(name: string | undefined | null): string {
  return (name ?? "").trim().toLowerCase().split(/\s+/)[0] ?? "";
}

export function staffCanPerform(
  staffName: string | undefined | null,
  serviceName: string | undefined | null,
  serviceCategory?: string | null,
): boolean {
  const key = firstNameKey(staffName);
  const forbidden = RESTRICTIONS[key];
  const haystack = `${serviceName ?? ""} ${serviceCategory ?? ""}`.toLowerCase();

  if (forbidden && forbidden.length > 0) {
    if (forbidden.some((kw) => haystack.includes(kw))) return false;
  }

  const svc = (serviceName ?? "").toLowerCase();
  for (const [needle, excluded] of Object.entries(SERVICE_EXCLUSIONS)) {
    if (svc.includes(needle) && excluded.includes(key)) return false;
  }

  return true;
}

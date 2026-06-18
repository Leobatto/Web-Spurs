const locationLinks: Record<string, string> = {
  ciromar: "https://maps.app.goo.gl/dqrgpyA7ahF35LNu8",
  telefonos: "https://maps.app.goo.gl/iGA7Bs8UREufx1VJ7",
  teléfonos: "https://maps.app.goo.gl/iGA7Bs8UREufx1VJ7",
  smata: "https://maps.app.goo.gl/3VYa9od4Uyoy1Y827",
};

function normalizeLocation(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function getLocationLink(location: string | null) {
  if (!location) {
    return null;
  }

  return locationLinks[normalizeLocation(location)] ?? null;
}

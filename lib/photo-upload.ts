export async function fileToDataUrl(value: FormDataEntryValue | null) {
  if (!(value instanceof File) || value.size === 0) {
    return null;
  }

  const buffer = Buffer.from(await value.arrayBuffer());
  const mimeType = value.type || "image/jpeg";

  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

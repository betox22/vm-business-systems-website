const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

function normalizeInstagramHandle(value) {
  const handle = String(value || "").replace(/^@/, "").trim();
  return /^[a-z0-9._]{2,30}$/i.test(handle) ? `@${handle}` : "";
}

export function extractContactInfo(text) {
  const source = String(text || "");
  const contact = {};
  const email = source.match(EMAIL_RE)?.[0] || "";
  if (email) contact.email = email;

  const phone = source.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0];
  if (phone) contact.phone = phone.trim();

  const textWithoutEmail = email ? source.replace(email, " ") : source;
  const explicitInstagram = textWithoutEmail.match(
    /\b(?:instagram|ig)\b\s*(?:es|is|:|-)?\s*@?([a-z0-9._]{2,30})\b/i,
  )?.[1];
  const standaloneHandle = textWithoutEmail.match(/(?:^|[\s(])@([a-z0-9._]{2,30})\b/i)?.[1];
  const instagram = normalizeInstagramHandle(explicitInstagram || standaloneHandle);
  if (instagram) contact.instagram = instagram;

  const whatsapp = source.match(/\b(?:whatsapp|wasap|wsp)\b\s*(?:es|:|-)?\s*([+\d][\d\s().-]{7,}\d)/i)?.[1];
  if (whatsapp) contact.whatsapp = whatsapp.trim();
  return contact;
}

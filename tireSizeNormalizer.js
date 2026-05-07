function normalizeTireSize(input) {
  if (typeof input !== "string" || !input.trim()) {
    return null;
  }

  const text = input
    .toUpperCase()
    .replace(/[\s\u3000]+/g, "")
    .replace(/[－—–﹣]/g, "-")
    .replace(/[／]/g, "/")
    .replace(/[Ｒ]/g, "R");

  const patterns = [
    /(\d{3})[\/-]?(\d{2})R?[\/-]?(\d{2})/,
    /(\d{3})(\d{2})R(\d{2})/,
    /(\d{3})(\d{2})(\d{2})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return `${match[1]}/${match[2]}R${match[3]}`;
    }
  }

  return null;
}

module.exports = {
  normalizeTireSize,
};

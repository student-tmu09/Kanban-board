export function unwrap(response, fallback = []) {
  const body = response?.data;
  return body?.data ?? body?.result ?? body ?? fallback;
}

export function getId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value._id || value.id || "";
}

export function getName(user) {
  if (!user) return "Unassigned";
  if (typeof user === "string") return user;
  return user.name || user.email || "User";
}
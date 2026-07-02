const BASE = import.meta.env.VITE_API_URL || window.location.origin;
export async function api(path, options = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
    body:
      options.body && typeof options.body !== "string"
        ? JSON.stringify(options.body)
        : options.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || "Request failed");
    error.data = data;
    error.status = res.status;
    throw error;
  }
  return data;
}
export async function uploadImage(file) {
  const body = new FormData();
  body.append("image", file);
  const res = await fetch(`${BASE}/api/uploads/image`, {
    method: "POST",
    credentials: "include",
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Upload failed");
  return data.url;
}
export { BASE };

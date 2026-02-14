const API_BASE = import.meta.env.VITE_API_BASE;

export async function fetchItems(search = "") {
  const url = new URL(`${API_BASE}/api/items`);
  if (search) url.searchParams.set("search", search);
  const res = await fetch(url);
  return res.json();
}

export async function scanAdd({ upc, format }) {
  const res = await fetch(`${API_BASE}/api/items/scan-add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ upc, format })
  });

  // If your backend returns 422 for missing metadata:
  if (res.status === 422) {
    const data = await res.json();
    return { needsManual: true, ...data };
  }

  return res.json();
}

// ✅ NEW
export async function updateItem(itemId, payload) {
  const res = await fetch(`${API_BASE}/api/items/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return res.json();
}

// ✅ NEW
export async function updateTitle(titleId, payload) {
  const res = await fetch(`${API_BASE}/api/titles/${titleId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function setRipped(id, ripped) {
  const res = await fetch(`${API_BASE}/api/items/${id}/ripped`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ripped })
  });
  return res.json();
}

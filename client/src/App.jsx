import { useEffect, useState } from "react";
import { fetchItems, scanAdd } from "./api";
import EditItemModal from "./EditItemModal";

export default function App() {
  const [items, setItems] = useState([]);
  const [upc, setUpc] = useState("");
  const [format, setFormat] = useState("dvd");

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  async function load() {
    setItems(await fetchItems());
  }

  useEffect(() => { load(); }, []);

  async function handleAdd() {
    if (!upc) return;

    const result = await scanAdd({ upc, format });

    if (result.alreadyOwned) {
      alert("Already owned!");
      return;
    }

    if (result.needsManual) {
      alert("UPC not found. Manual add coming next.");
      return;
    }

    // ✅ open edit modal with returned item
    setEditItem(result.item);
    setEditOpen(true);

    setUpc("");
    load();
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Media Vault</h1>

      <div style={{ marginBottom: 20 }}>
        <input
          placeholder="Scan or enter UPC"
          value={upc}
          onChange={(e) => setUpc(e.target.value)}
        />
        <select value={format} onChange={(e) => setFormat(e.target.value)}>
          <option value="dvd">DVD</option>
          <option value="bluray">BluRay</option>
          <option value="uhd">UHD</option>
        </select>
        <button onClick={handleAdd}>Add</button>
      </div>

      {/* table */}
      <table border="1" cellPadding="6">
        <thead>
          <tr>
            <th>Title</th>
            <th>Type</th>
            <th>Format</th>
            <th>Runtime</th>
            <th>Ripped</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td>{i.name}</td>
              <td>{i.media_type}</td>
              <td>{i.format}</td>
              <td>{i.runtime_minutes || "-"}</td>
              <td>{i.ripped ? "Yes" : "No"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <EditItemModal
        open={editOpen}
        item={editItem}
        onClose={() => setEditOpen(false)}
        onSaved={load}
      />
    </div>
  );
}

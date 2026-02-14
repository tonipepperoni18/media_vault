import { useEffect, useState } from "react";
import { updateItem, updateTitle } from "./api";

export default function EditItemModal({ open, item, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);

  // Item fields
  const [location, setLocation] = useState("");
  const [edition, setEdition] = useState("");
  const [condition, setCondition] = useState("");
  const [ripPath, setRipPath] = useState("");
  const [ripped, setRipped] = useState(false);

  // Title fields
  const [titleName, setTitleName] = useState("");
  const [mediaType, setMediaType] = useState("movie");
  const [runtimeMinutes, setRuntimeMinutes] = useState("");
  const [seasonsCount, setSeasonsCount] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!item) return;

    // item (copy)
    setLocation(item.location ?? "");
    setEdition(item.edition ?? "");
    setCondition(item.condition ?? "");
    setRipPath(item.rip_path ?? "");
    setRipped(!!item.ripped);

    // title
    setTitleName(item.name ?? "");
    setMediaType(item.media_type ?? "movie");
    setRuntimeMinutes(item.runtime_minutes ?? "");
    setSeasonsCount(item.seasons_count ?? "");
    setDescription(item.description ?? "");
  }, [item]);

  if (!open || !item) return null;

  async function handleSave() {
    setSaving(true);
    try {
      // 1) Update title first
      await updateTitle(item.title_id, {
        name: titleName.trim() || item.name, // avoid blank
        media_type: mediaType,
        runtime_minutes: runtimeMinutes === "" ? null : Number(runtimeMinutes),
        seasons_count:
          mediaType === "tv"
            ? (seasonsCount === "" ? null : Number(seasonsCount))
            : null,
        description: description === "" ? null : description
      });

      // 2) Update item (copy)
      await updateItem(item.id, {
        ripped,
        location: location === "" ? null : location,
        edition: edition === "" ? null : edition,
        condition: condition === "" ? null : condition,
        rip_path: ripPath === "" ? null : ripPath
      });

      onSaved?.();
      onClose?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={{ margin: 0 }}>Edit Details</h2>
          <button onClick={onClose} disabled={saving}>✕</button>
        </div>

        {/* Locked fields */}
        <div style={styles.grid}>
          <label style={styles.label}>
            UPC (locked)
            <input style={styles.input} value={item.upc} disabled />
          </label>

          <label style={styles.label}>
            Format (locked)
            <input style={styles.input} value={item.format} disabled />
          </label>
        </div>

        <hr />

        {/* Title fields */}
        <h3 style={styles.sectionTitle}>Title</h3>
        <div style={styles.grid}>
          <label style={styles.label}>
            Title name
            <input
              style={styles.input}
              value={titleName}
              onChange={(e) => setTitleName(e.target.value)}
            />
          </label>

          <label style={styles.label}>
            Type
            <select
              style={styles.input}
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value)}
            >
              <option value="movie">Movie</option>
              <option value="tv">TV</option>
            </select>
          </label>

          <label style={styles.label}>
            Runtime (minutes)
            <input
              style={styles.input}
              inputMode="numeric"
              value={runtimeMinutes}
              onChange={(e) => setRuntimeMinutes(e.target.value)}
              placeholder="e.g., 126"
            />
          </label>

          {mediaType === "tv" && (
            <label style={styles.label}>
              Seasons count
              <input
                style={styles.input}
                inputMode="numeric"
                value={seasonsCount}
                onChange={(e) => setSeasonsCount(e.target.value)}
                placeholder="e.g., 5"
              />
            </label>
          )}
        </div>

        <label style={styles.label}>
          Description
          <textarea
            style={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </label>

        <hr />

        {/* Item fields */}
        <h3 style={styles.sectionTitle}>Copy</h3>
        <div style={styles.grid}>
          <label style={styles.label}>
            Location
            <input
              style={styles.input}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </label>

          <label style={styles.label}>
            Edition
            <input
              style={styles.input}
              value={edition}
              onChange={(e) => setEdition(e.target.value)}
            />
          </label>

          <label style={styles.label}>
            Condition
            <input
              style={styles.input}
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            />
          </label>

          <label style={styles.label}>
            Ripped
            <select
              style={styles.input}
              value={ripped ? "yes" : "no"}
              onChange={(e) => setRipped(e.target.value === "yes")}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </label>
        </div>

        <label style={styles.label}>
          Rip path (optional)
          <input
            style={styles.input}
            value={ripPath}
            onChange={(e) => setRipPath(e.target.value)}
            placeholder="/mnt/media/..."
          />
        </label>

        <div style={styles.footer}>
          <button onClick={onClose} disabled={saving}>Cancel</button>
          <button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16
  },
  modal: {
    width: "min(900px, 100%)",
    background: "gray",
    borderRadius: 10,
    padding: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  sectionTitle: { margin: "8px 0" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12
  },
  label: { display: "grid", gap: 6, fontSize: 14, marginTop: 10 },
  input: { padding: 10, border: "1px solid #ccc", borderRadius: 8 },
  textarea: { padding: 10, border: "1px solid #ccc", borderRadius: 8, width: "100%" },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 14
  }
};

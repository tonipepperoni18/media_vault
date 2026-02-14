import express from "express"
import { pool } from "./db.js"

const router = express.Router();

async function fetchAPI(upc) {
    const res = await fetch(`https://go-upc.com/api/v1/code/${encodeURIComponent(upc)}`, {
        headers: { Authorization: `Bearer ${process.env.GO_UPC_API_KEY}` }
    })
    const text = await res.text(); // read raw body once

  // Log the status + first part of body (do NOT log your API key)
  console.log("GO-UPC STATUS:", res.status);
  console.log("GO-UPC BODY (first 300):", text.slice(0, 300));

  // If not 200, stop here with a clear error
  if (!res.ok) {
    throw new Error(`Go-UPC error ${res.status}: ${text.slice(0, 200)}`);
  }

  // parse JSON from raw body
  return JSON.parse(text);

    if (res.status === 404) return null;
    if (res. status === 429) throw new Error("Go-UPC rate limited (429).")
    if(!res.ok) throw new Error(`Go-UPC error ${res.status}`)
        return res.json()
}


router.get("/", async (req, res) => {
    const search = (req.query.search || "").trim()

    const params = []
    let where = " "

    if (search) {
        params.push(`%${search.toLowerCase()}%`)
        where = `where lower(t.name) LIKE $${params.length} or i.upc LIKE $${params.length}`
    }

    const q = `
    SELECT 
        i.id,
        i.upc,
        i.format,
        i.ripped, 
        i.created_at,
        t.id AS title_id,
        t.name,
        t.media_type,
        t.runtime_minutes,
        t.seasons_count
    FROM items i
    JOIN titles t on t.id = i.title_id
    ${where}
    ORDER by i.created_at DESC
    LIMIT 25

`;

const { rows } = await pool.query(q, params)
res.json(rows)
})





router.post("/scan-add", async (req, res) => {
  const { upc, format } = req.body || {};
  if (!upc || !format) return res.status(400).json({ error: "upc and format are required fields" });

  // Clean UPC (scanners sometimes add whitespace/newlines)
  const cleanedUpc = String(upc).replace(/\D/g, "");
  if (cleanedUpc.length < 8 || cleanedUpc.length > 14) {
    return res.status(400).json({ error: "Invalid UPC", upc });
  }

  let meta = null;
  try {
    meta = await fetchAPI(cleanedUpc);
  } catch (error) {
    return res.status(502).json({ error: error.message });
  }

  if (!meta) {
    return res.status(422).json({ error: "UPC not found in Go-UPC. Add manually.", upc: cleanedUpc });
  }

  const product = meta.product || null;
  const name = product?.name?.trim() || null;

  if (!name) {
    return res.status(422).json({ error: "No product name returned. Add manually.", upc: cleanedUpc });
  }

  const description = product?.description || null;
  const imageUrl = product?.imageUrl || null;
  const brand = product?.brand || null;
  const codeType = meta?.codeType || null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Find title by name (simple MVP)
    const findTitle = await client.query(
      `SELECT id FROM titles WHERE lower(name)=lower($1) LIMIT 1`,
      [name]
    );

    let titleId;
    if (findTitle.rowCount) {
      titleId = findTitle.rows[0].id;

      await client.query(
        `UPDATE titles
         SET description = COALESCE(description, $2),
             image_url  = COALESCE(image_url,  $3),
             brand      = COALESCE(brand,      $4),
             updated_at = now()
         WHERE id = $1`,
        [titleId, description, imageUrl, brand]
      );
    } else {
      const insTitle = await client.query(
        `INSERT INTO titles (name, description, image_url, brand)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [name, description, imageUrl, brand]
      );
      titleId = insTitle.rows[0].id;
    }

    // Insert item (no duplicates)
    const insItem = await client.query(
      `INSERT INTO items (title_id, upc, code_type, format)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [titleId, cleanedUpc, codeType, format]
    );

        const full = await client.query(
          `SELECT
              i.id,
              i.upc,
              i.format,
              i.ripped,
              i.location,
              i.edition,
              i.condition,
              i.rip_path,
              t.id AS title_id,
              t.name,
              t.media_type,
              t.runtime_minutes,
              t.seasons_count,
              t.description,
              t.image_url
          FROM items i
          JOIN titles t ON t.id = i.title_id
          WHERE i.id = $1`,
          [insItem.rows[0].id]
        );

        await client.query("COMMIT");

        res.json({
          added: true,
          item: full.rows[0]
        });

  } catch (err) {
    await client.query("ROLLBACK");

    if (err.code === "23505") {
      return res.json({ alreadyOwned: true });
    }

    console.error(err);
    res.status(500).json({ error: "Server Error" });
  } finally {
    client.release();
  }
});


router.patch("/:id/ripped", async (req, res) => {
  const { id } = req.params;
  const { ripped } = req.body || {};
  if (typeof ripped !== "boolean") return res.status(400).json({ error: "ripped must be boolean" });

  const q = `
    UPDATE items
    SET ripped = $2,
        ripped_at = CASE WHEN $2 THEN COALESCE(ripped_at, now()) ELSE NULL END,
        updated_at = now()
    WHERE id = $1
    RETURNING id, ripped, ripped_at;
  `;
  const { rows } = await pool.query(q, [id, ripped]);
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
});

router.patch("/items/:id", async (req, res) => {
  const { id } = req.params;
  const { ripped, location, edition, condition, rip_path } = req.body;

  try {
    const result = await pool.query(
      `UPDATE items
       SET
         ripped = COALESCE($2, ripped),
         ripped_at = CASE
             WHEN $2 = true THEN COALESCE(ripped_at, now())
             WHEN $2 = false THEN null
             ELSE ripped_at
         END,
         location = COALESCE($3, location),
         edition = COALESCE($4, edition),
         condition = COALESCE($5, condition),
         rip_path = COALESCE($6, rip_path),
         updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id, ripped, location, edition, condition, rip_path]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.patch("/titles/:id", async (req, res) => {
  const { id } = req.params;
  const {
    name,
    media_type,
    runtime_minutes,
    seasons_count,
    description
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE titles
       SET
         name = COALESCE($2, name),
         media_type = COALESCE($3, media_type),
         runtime_minutes = COALESCE($4, runtime_minutes),
         seasons_count = COALESCE($5, seasons_count),
         description = COALESCE($6, description),
         updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [id, name, media_type, runtime_minutes, seasons_count, description]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Title not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


export default router;
/**
 * Generic SQLite CRUD router factory.
 *
 * tableName        – SQLite table name
 * opts.requiredFields – fields that must be present on POST
 * opts.columns     – array of allowed column names for insert/update
 *                    (maps camelCase body key → snake_case column)
 *                    e.g. [{ body: 'subjectId', col: 'subject_id' }]
 * opts.onCreate    – (row, req) => extraFields object
 * opts.toClient    – (row) => clientObj  (rename snake→camel)
 */
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const db = require("./db");
const { authRequired } = require("../middleware/auth");

function makeCrudRouter(tableName, opts = {}) {
  const {
    requiredFields = [],
    columns = [],
    onCreate = null,
    toClient = (r) => r,
  } = opts;

  const router = express.Router();
  router.use(authRequired);

  // Build column mappings: body key → sql column name
  // Falls back to identical names if columns array is empty
  function buildFields(body, forUpdate = false) {
    const fields = {};
    if (columns.length === 0) {
      // Pass-through: use body keys directly as column names
      Object.entries(body).forEach(([k, v]) => {
        if (k !== "id" && k !== "userId" && k !== "user_id") fields[k] = v;
      });
    } else {
      columns.forEach(({ body: bk, col }) => {
        if (body[bk] !== undefined) fields[col] = body[bk];
      });
    }
    return fields;
  }

  // LIST
  router.get("/", (req, res) => {
    const rows = db
      .prepare(`SELECT * FROM ${tableName} WHERE user_id = ? ORDER BY created_at DESC`)
      .all(req.userId);
    res.json(rows.map(toClient));
  });

  // GET ONE
  router.get("/:id", (req, res) => {
    const row = db
      .prepare(`SELECT * FROM ${tableName} WHERE id = ? AND user_id = ?`)
      .get(req.params.id, req.userId);
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(toClient(row));
  });

  // CREATE
  router.post("/", (req, res) => {
    for (const f of requiredFields) {
      const val = req.body[f];
      if (val === undefined || val === null || val === "")
        return res.status(400).json({ error: `Field '${f}' is required` });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    let extra = {};
    if (onCreate) extra = onCreate(req.body, req) || {};

    const fields = buildFields(req.body);
    Object.assign(fields, extra);
    // Never include updated_at in the fields map — we handle it separately
    delete fields["updated_at"];

    // Check if table has an updated_at column
    const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
    const hasUpdatedAt = tableInfo.some((c) => c.name === "updated_at");

    const colNames = [
      "id", "user_id", "created_at",
      ...Object.keys(fields),
      ...(hasUpdatedAt ? ["updated_at"] : []),
    ];
    const placeholders = colNames.map(() => "?").join(", ");
    const values = [
      id, req.userId, now,
      ...Object.values(fields),
      ...(hasUpdatedAt ? [now] : []),
    ];

    db.prepare(
      `INSERT INTO ${tableName} (${colNames.join(", ")}) VALUES (${placeholders})`
    ).run(...values);

    const row = db
      .prepare(`SELECT * FROM ${tableName} WHERE id = ?`)
      .get(id);
    res.status(201).json(toClient(row));
  });

  // UPDATE
  router.put("/:id", (req, res) => {
    const existing = db
      .prepare(`SELECT * FROM ${tableName} WHERE id = ? AND user_id = ?`)
      .get(req.params.id, req.userId);
    if (!existing) return res.status(404).json({ error: "Not found" });

    const fields = buildFields(req.body, true);
    const now = new Date().toISOString();

    // Only add updated_at if column exists on table
    const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all();
    const hasUpdatedAt = tableInfo.some((c) => c.name === "updated_at");
    if (hasUpdatedAt) fields["updated_at"] = now;

    if (Object.keys(fields).length === 0)
      return res.json(toClient(existing));

    const setClauses = Object.keys(fields).map((k) => `${k} = ?`).join(", ");
    const values = [...Object.values(fields), req.params.id, req.userId];

    db.prepare(
      `UPDATE ${tableName} SET ${setClauses} WHERE id = ? AND user_id = ?`
    ).run(...values);

    const updated = db
      .prepare(`SELECT * FROM ${tableName} WHERE id = ?`)
      .get(req.params.id);
    res.json(toClient(updated));
  });

  // DELETE
  router.delete("/:id", (req, res) => {
    const result = db
      .prepare(`DELETE FROM ${tableName} WHERE id = ? AND user_id = ?`)
      .run(req.params.id, req.userId);
    if (result.changes === 0) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  });

  return router;
}

module.exports = { makeCrudRouter };

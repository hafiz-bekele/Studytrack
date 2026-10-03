const { makeCrudRouter } = require("../utils/crudFactory");

function toClient(r) {
  if (!r) return r;
  return {
    id: r.id,
    userId: r.user_id,
    subjectId: r.subject_id,
    title: r.title,
    content: r.content,
    tags: r.tags,
    isPinned: !!r.is_pinned,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

module.exports = makeCrudRouter("notes", {
  requiredFields: ["title", "content"],
  columns: [
    { body: "title", col: "title" },
    { body: "content", col: "content" },
    { body: "subjectId", col: "subject_id" },
    { body: "tags", col: "tags" },
    { body: "isPinned", col: "is_pinned" },
  ],
  toClient,
});

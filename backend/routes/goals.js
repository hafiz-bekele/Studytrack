const { makeCrudRouter } = require("../utils/crudFactory");

function toClient(r) {
  if (!r) return r;
  return {
    id: r.id,
    userId: r.user_id,
    subjectId: r.subject_id,
    type: r.type,
    targetHours: r.target_hours,
    createdAt: r.created_at,
  };
}

module.exports = makeCrudRouter("goals", {
  requiredFields: ["type", "targetHours"],
  columns: [
    { body: "type", col: "type" },
    { body: "targetHours", col: "target_hours" },
    { body: "subjectId", col: "subject_id" },
  ],
  toClient,
});

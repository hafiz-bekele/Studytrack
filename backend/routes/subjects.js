const { makeCrudRouter } = require("../utils/crudFactory");

function toClient(r) {
  if (!r) return r;
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    color: r.color,
    totalTopics: r.total_topics,
    completedTopics: r.completed_topics,
    description: r.description,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

module.exports = makeCrudRouter("subjects", {
  requiredFields: ["name"],
  columns: [
    { body: "name", col: "name" },
    { body: "color", col: "color" },
    { body: "totalTopics", col: "total_topics" },
    { body: "completedTopics", col: "completed_topics" },
    { body: "description", col: "description" },
  ],
  toClient,
});

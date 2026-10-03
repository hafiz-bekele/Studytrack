const express = require("express");
const db = require("../utils/db");
const { authRequired } = require("../middleware/auth");
const { BADGE_DEFS } = require("../utils/achievements");

const router = express.Router();
router.use(authRequired);

router.get("/", (req, res) => {
  const earned = db
    .prepare("SELECT * FROM achievements WHERE user_id = ?")
    .all(req.userId);
  const earnedMap = Object.fromEntries(earned.map((a) => [a.code, a]));

  const all = BADGE_DEFS.map((b) => ({
    code: b.code,
    label: b.label,
    desc: b.desc,
    earned: !!earnedMap[b.code],
    earnedAt: earnedMap[b.code]?.earned_at || null,
  }));
  res.json(all);
});

module.exports = router;

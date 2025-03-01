const express = require("express");
const router = express.Router();
const WalkController = require("../controllers/scheduledWalkController");
const verifyToken = require("../middleware/authMiddleware");
const verifyMarshal = require("../middleware/verifyMarshal");

router.post(
	"/newWalk",
	verifyToken,
	verifyMarshal,
	WalkController.addScheduledWalk
);
router.get("/", verifyToken, WalkController.getAllScheduledWalks);
router.post("/confirm", verifyToken, WalkController.confirm);

module.exports = router;

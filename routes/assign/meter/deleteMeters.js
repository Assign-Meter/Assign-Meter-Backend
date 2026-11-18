
const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const MeterDB = require("../../../models/meter");
const AuthMiddleware = require("../../../middleware/authentication");
const { allowRoles } = require("../../../middleware/rbac");

router.use(AuthMiddleware);
router.use(allowRoles("admin", "superadmin"));

router.delete("/", async (req, res) => {
  try {
    const user = req.user;
    const pkg = user?.pkg;

    // Validate authenticated user
    if (!user || !pkg) {
      return res.status(401).json({
        status: "error",
        message: "User data not available",
      });
    }

    // Get meter IDs
    const { meters } = req.body;

    if (!Array.isArray(meters) || meters.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Please select at least one meter",
      });
    }

    // Remove duplicate IDs
    const uniqueMeters = [...new Set(meters)];

    // Validate ObjectIds
    const invalidIds = uniqueMeters.filter(
      (id) => !mongoose.Types.ObjectId.isValid(id)
    );

    if (invalidIds.length > 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid meter IDs provided",
        invalidIds,
      });
    }

    // Bulk delete within user's package only
    const result = await MeterDB.deleteMany({
      _id: {
        $in: uniqueMeters,
      },
      pkg,
    });

    return res.status(200).json({
      status: "success",
      message: "Meters deleted successfully",
      data: {
        requestedCount: uniqueMeters.length,
        deletedCount: result.deletedCount,
        notFoundCount: uniqueMeters.length - result.deletedCount,
      },
    });

  } catch (error) {
    console.error("Bulk meter deletion error:", error);

    return res.status(500).json({
      status: "error",
      message: "Failed to delete meters",
    });
  }
});

module.exports = router;

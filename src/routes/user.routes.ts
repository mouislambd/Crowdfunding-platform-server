import express from "express";
import {
    getAllUsers,
    updateUserRole,
    removeUser,
    getAdminStats,
} from "../controllers/user.controller";
import { requireAuth, requireRole } from "../middlewares/auth";

const router = express.Router();

router.get("/", requireAuth, requireRole("admin"), getAllUsers);
router.patch("/role/:id", requireAuth, requireRole("admin"), updateUserRole);
router.delete("/:id", requireAuth, requireRole("admin"), removeUser);
router.get("/admin-stats", requireAuth, requireRole("admin"), getAdminStats);

export default router;

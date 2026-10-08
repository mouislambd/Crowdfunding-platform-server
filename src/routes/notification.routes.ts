import express from "express";
import { requireAuth } from "../middlewares/auth";
import { getMyNotifications } from "../controllers/notification.controller";

const router = express.Router();

router.get("/", requireAuth, getMyNotifications);

export default router;
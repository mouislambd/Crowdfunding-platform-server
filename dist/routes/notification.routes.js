"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middlewares/auth");
const notification_controller_1 = require("../controllers/notification.controller");
const router = express_1.default.Router();
router.get("/", auth_1.requireAuth, notification_controller_1.getMyNotifications);
exports.default = router;

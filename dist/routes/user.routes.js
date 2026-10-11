"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const user_controller_1 = require("../controllers/user.controller");
const auth_1 = require("../middlewares/auth");
const router = express_1.default.Router();
router.get("/", auth_1.requireAuth, (0, auth_1.requireRole)("admin"), user_controller_1.getAllUsers);
router.patch("/role/:id", auth_1.requireAuth, (0, auth_1.requireRole)("admin"), user_controller_1.updateUserRole);
router.delete("/:id", auth_1.requireAuth, (0, auth_1.requireRole)("admin"), user_controller_1.removeUser);
router.get("/admin-stats", auth_1.requireAuth, (0, auth_1.requireRole)("admin"), user_controller_1.getAdminStats);
exports.default = router;

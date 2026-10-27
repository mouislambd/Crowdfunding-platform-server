"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminStats = exports.removeUser = exports.updateUserRole = exports.getAllUsers = void 0;
require("dotenv/config");
const mongodb_1 = require("mongodb");
const Payment_1 = require("../models/Payment");
const uri = process.env.MONGODB_URI;
if (!uri) {
    throw new Error("MONGODB_URI is not set");
}
const client = new mongodb_1.MongoClient(uri);
// Get all users (Admin - Manage Users)
const getAllUsers = async (req, res) => {
    try {
        const db = client.db();
        const users = await db
            .collection("user")
            .find({}, { projection: { name: 1, email: 1, image: 1, role: 1, credits: 1 } })
            .toArray();
        res.status(200).json(users);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAllUsers = getAllUsers;
// Update user role (Admin)
const updateUserRole = async (req, res) => {
    try {
        const { role } = req.body;
        const { ObjectId } = await Promise.resolve().then(() => __importStar(require("mongodb")));
        const db = client.db();
        const result = await db
            .collection("user")
            .findOneAndUpdate({ _id: new ObjectId(req.params.id) }, { $set: { role } }, { returnDocument: "after" });
        res.status(200).json(result);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.updateUserRole = updateUserRole;
// Delete/remove user (Admin)
const removeUser = async (req, res) => {
    try {
        const { ObjectId } = await Promise.resolve().then(() => __importStar(require("mongodb")));
        const db = client.db();
        await db.collection("user").deleteOne({ _id: new ObjectId(req.params.id) });
        res.status(200).json({ message: "User removed successfully" });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.removeUser = removeUser;
// Get admin dashboard stats
const getAdminStats = async (req, res) => {
    try {
        const db = client.db();
        const users = await db.collection("user").find().toArray();
        const totalPayments = await Payment_1.Payment.countDocuments();
        const totalSupporters = users.filter((u) => u.role === "supporter").length;
        const totalBuilders = users.filter((u) => u.role === "builder").length;
        const totalCredits = users.reduce((sum, u) => sum + (u.credits || 0), 0);
        res.status(200).json({ totalSupporters, totalBuilders, totalCredits, totalPayments });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
};
exports.getAdminStats = getAdminStats;

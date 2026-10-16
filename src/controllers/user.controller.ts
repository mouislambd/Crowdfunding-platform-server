import { Request, Response } from "express";
import { MongoClient } from "mongodb";
import { Payment } from "../models/Payment";

const client = new MongoClient(process.env.MONGODB_URI as string);

// Get all users (Admin - Manage Users)
export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const db = client.db();
        const users = await db
            .collection("user")
            .find({}, { projection: { name: 1, email: 1, image: 1, role: 1, credits: 1 } })
            .toArray();

        res.status(200).json(users);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Update user role (Admin)
export const updateUserRole = async (req: Request, res: Response) => {
    try {
        const { role } = req.body;
        const { ObjectId } = await import("mongodb");
        const db = client.db();

        const result = await db
            .collection("user")
            .findOneAndUpdate(
               { _id: new ObjectId(req.params.id as string) },
                { $set: { role } },
                { returnDocument: "after" }
            );

        res.status(200).json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Delete/remove user (Admin)
export const removeUser = async (req: Request, res: Response) => {
    try {
        const { ObjectId } = await import("mongodb");
        const db = client.db();

        await db.collection("user").deleteOne({ _id: new ObjectId(req.params.id as string) });

        res.status(200).json({ message: "User removed successfully" });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// Get admin dashboard stats
export const getAdminStats = async (req: Request, res: Response) => {
    try {
        const db = client.db();
        const users = await db.collection("user").find().toArray();
        const totalPayments = await Payment.countDocuments();

        const totalSupporters = users.filter((u: any) => u.role === "supporter").length;
        const totalBuilders = users.filter((u: any) => u.role === "builder").length;
        const totalCredits = users.reduce((sum: number, u: any) => sum + (u.credits || 0), 0);

        res.status(200).json({ totalSupporters, totalBuilders, totalCredits, totalPayments });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
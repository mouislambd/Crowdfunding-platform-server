import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI as string);

async function backfill() {
    try {
        await client.connect();
        const db = client.db();
        const users = await db.collection("user").find().toArray();

        for (const user of users) {
            if (user.role === "admin") continue;
            
            const currentCredits = user.credits || 0;
            if (currentCredits === 0) {
                let newCredits = 0;
                if (user.role === "supporter") {
                    newCredits = 50;
                } else if (user.role === "builder") {
                    newCredits = 20;
                }
                
                if (newCredits > 0) {
                    await db.collection("user").updateOne(
                        { _id: user._id },
                        { $set: { credits: newCredits } }
                    );
                    console.log(`Updated ${user.email}: ${newCredits} credits`);
                }
            }
        }
        console.log("Backfill complete");
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}

backfill();

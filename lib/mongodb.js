import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const client = new MongoClient(process.env.VECTOR_DB);

await client.connect();

export const db = client.db("mindstack-ai");


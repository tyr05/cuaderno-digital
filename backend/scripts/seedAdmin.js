// backend/scripts/seedAdmin.js
import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "../models/User.js";

dotenv.config();
const { MONGO_URI } = process.env;

async function run() {
  await mongoose.connect(MONGO_URI);
  const email = "admin@escuela.com";
  const plain = "123456";
  const hash = await bcrypt.hash(plain, 10);

  const up = await User.findOneAndUpdate(
    { email },
    { $setOnInsert: { nombre: "Admin", email, passwordHash: hash, rol: "admin" } },
    { upsert: true, new: true }
  );
  console.log("Admin listo:", up.email);
  await mongoose.disconnect();
}
run().catch(console.error);

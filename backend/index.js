// index.js
import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "./app.js";

dotenv.config();

const { MONGO_URI, JWT_SECRET, PORT } = process.env;

if (!MONGO_URI || !JWT_SECRET) {
  console.error("❌ Faltan MONGO_URI o JWT_SECRET");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Conectado a MongoDB"))
  .catch((err) => {
    console.error("❌ Error MongoDB:", err.message);
    process.exit(1);
  });

app.listen(PORT || 5000, () => {
  console.log(`✅ Servidor en http://localhost:${PORT || 5000}`);
});

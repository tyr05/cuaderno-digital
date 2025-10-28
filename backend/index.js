import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "./app.js";

dotenv.config();

const missingEnv = ["MONGO_URI", "JWT_SECRET"].filter((key) => {
  const value = process.env[key];
  return typeof value !== "string" || value.trim() === "";
});

if (missingEnv.length) {
  console.error(`❌ Faltan variables de entorno obligatorias: ${missingEnv.join(", ")}`);
  process.exit(1);
}

const { MONGO_URI } = process.env;
const PORT = Number.parseInt(process.env.PORT, 10) || 5000;

mongoose.connection.on("connected", () => {
  const { name, host } = mongoose.connection;
  console.log(`✅ Conectado a MongoDB (${name} @ ${host})`);
});

mongoose.connection.on("error", (error) => {
  console.error("❌ Error de conexión a MongoDB:", error);
});

async function start() {
  try {
    await mongoose.connect(MONGO_URI);
    app.listen(PORT, () => {
      console.log(`🚀 Backend listo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ No se pudo iniciar el servidor:", error);
    process.exit(1);
  }
}

start();

process.on("unhandledRejection", (reason) => {
  console.error("⚠️ Promesa rechazada sin manejar:", reason);
});

process.on("SIGINT", async () => {
  await mongoose.disconnect().catch(() => {});
  process.exit(0);
});

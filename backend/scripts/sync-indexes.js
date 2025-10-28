import dotenv from "dotenv";
import mongoose from "mongoose";

import Student from "../models/Student.js";
import StudentLinkToken from "../models/StudentLinkToken.js";
import AlumnoPadron from "../models/AlumnoPadron.js";
import FamilyStudent from "../models/FamilyStudent.js";
import AnuncioRecibo from "../models/AnuncioRecibo.js";
import Asistencia from "../models/Asistencia.js";

dotenv.config();

const { MONGO_URI } = process.env;

if (!MONGO_URI) {
  console.error("❌ Falta la variable de entorno MONGO_URI");
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("✅ Conectado a la base de datos, sincronizando índices...");

  const models = [
    Student,
    StudentLinkToken,
    AlumnoPadron,
    FamilyStudent,
    AnuncioRecibo,
    Asistencia,
  ];

  for (const model of models) {
    const result = await model.syncIndexes();
    console.log(`✔️ ${model.modelName}.syncIndexes()`, result);
  }

  await mongoose.disconnect();
  console.log("🏁 Proceso finalizado");
}

main().catch((error) => {
  console.error("❌ Error sincronizando índices:", error);
  process.exit(1);
});

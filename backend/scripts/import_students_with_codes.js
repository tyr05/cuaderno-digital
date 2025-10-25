import fs from "fs";
import path from "path";
import csv from "csv-parser";
import mongoose from "mongoose";
import dotenv from "dotenv";
import Student from "../models/Student.js";

dotenv.config();

const [,, inputFile] = process.argv;

if (!inputFile) {
  console.error("Uso: node scripts/import_students_with_codes.js <archivo.csv>");
  process.exit(1);
}

const filePath = path.resolve(process.cwd(), inputFile);
if (!fs.existsSync(filePath)) {
  console.error(`No se encontró el archivo ${filePath}`);
  process.exit(1);
}

const { MONGO_URI } = process.env;
if (!MONGO_URI) {
  console.error("Falta MONGO_URI en el entorno");
  process.exit(1);
}

const registros = [];

console.log(`Leyendo ${filePath}...`);
fs.createReadStream(filePath)
  .pipe(csv())
  .on("data", (row) => registros.push(row))
  .on("end", async () => {
    try {
      await mongoose.connect(MONGO_URI);
      console.log(`Importando ${registros.length} estudiantes...`);

      const ops = registros.map((row) => {
        const nombre = String(row.nombre || row.Nombre || "").trim();
        const curso = Number(row.curso ?? row.Curso ?? row.anio ?? row.Año);
        const division = String(row.division || row.Division || row.división || row.División || "").trim();
        const codigo = String(row.codigo || row.Codigo || row.Código || "").trim().toUpperCase();

        if (!nombre || !codigo || !Number.isFinite(curso) || !division) {
          console.warn(`Fila omitida por falta de datos: ${JSON.stringify(row)}`);
          return null;
        }

        return {
          updateOne: {
            filter: { codigo },
            update: {
              $set: {
                nombre,
                curso,
                division,
                codigo,
              },
            },
            upsert: true,
          },
        };
      }).filter(Boolean);

      if (ops.length === 0) {
        console.warn("No se encontraron filas válidas para importar");
      } else {
        const result = await Student.bulkWrite(ops, { ordered: false });
        console.log("Importación completada", result.result);
      }
    } catch (error) {
      console.error("Error importando estudiantes", error);
      process.exitCode = 1;
    } finally {
      await mongoose.disconnect();
    }
  });

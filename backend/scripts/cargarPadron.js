// scripts/cargarPadron.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import csvParser from "csv-parser";
import AlumnoPadron from "../models/AlumnoPadron.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

const { MONGO_URI } = process.env;

if (!MONGO_URI) {
  console.error("[cargarPadron] Falta la variable MONGO_URI en el archivo .env");
  process.exit(1);
}

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Uso: node scripts/cargarPadron.js <archivo.csv>");
  process.exit(1);
}

const csvPath = path.isAbsolute(inputPath)
  ? inputPath
  : path.resolve(process.cwd(), inputPath);

if (!fs.existsSync(csvPath)) {
  console.error(`No se encontró el archivo: ${csvPath}`);
  process.exit(1);
}

function parseRow(row = {}) {
  const normalize = (value) => (typeof value === "string" ? value.trim() : "");
  return {
    nombre: normalize(row.nombre),
    curso: normalize(row.curso),
    division: normalize(row.division),
    codigo: normalize(row.codigo),
  };
}

async function readCsv(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(
        csvParser({
          mapHeaders: ({ header }) => header.trim().toLowerCase(),
          skipLines: 0,
          trim: true,
        })
      )
      .on("data", (data) => {
        const parsed = parseRow(data);
        if (parsed.codigo) {
          rows.push(parsed);
        }
      })
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

(async () => {
  try {
    const registros = await readCsv(csvPath);
    if (!registros.length) {
      console.log("No se encontraron filas válidas para procesar.");
      process.exit(0);
    }

    await mongoose.connect(MONGO_URI);

    const operations = registros.map(({ nombre, curso, division, codigo }) => ({
      updateOne: {
        filter: { codigo },
        update: {
          $set: {
            nombre,
            curso,
            division,
          },
          $setOnInsert: {
            vinculado: false,
          },
        },
        upsert: true,
      },
    }));

    const result = await AlumnoPadron.bulkWrite(operations, { ordered: false });

    const insertados = result.upsertedCount || 0;
    const actualizados = result.modifiedCount || 0;

    console.log(`Padrón procesado: ${registros.length} registros.`);
    console.log(`Insertados: ${insertados}. Actualizados: ${actualizados}.`);
  } catch (error) {
    console.error("Error cargando padrón:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
})();

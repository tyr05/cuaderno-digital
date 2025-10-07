import dotenv from "dotenv";
import mongoose from "mongoose";

import Curso from "../models/Curso.js";

dotenv.config();

const { MONGO_URI } = process.env;

if (!MONGO_URI) {
  console.error("❌ Falta la variable de entorno MONGO_URI");
  process.exit(1);
}

const anios = [1, 2, 3, 4, 5];
const divisiones = ["1", "2"];
const turnos = [
  { codigo: "TM", etiqueta: "Turno Mañana" },
  { codigo: "TT", etiqueta: "Turno Tarde" },
];

const summary = {
  created: 0,
  updated: 0,
  unchanged: 0
};

const createdOrUpdated = [];

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Conectado a MongoDB");

    for (const anio of anios) {
      for (const division of divisiones) {
        for (const turno of turnos) {
          const nombre = `${anio}° ${division} ${turno.etiqueta}`;
          const filter = { anio, division, turno: turno.codigo };
          const update = {
            $set: {
              nombre,
              anio,
              division,
              turno: turno.codigo
            }
          };

          const result = await Curso.updateOne(filter, update, { upsert: true });

          if (result.upsertedCount && result.upsertedCount > 0) {
            summary.created += 1;
            createdOrUpdated.push({ nombre, accion: "creado" });
          } else if (result.modifiedCount && result.modifiedCount > 0) {
            summary.updated += 1;
            createdOrUpdated.push({ nombre, accion: "actualizado" });
          } else {
            summary.unchanged += 1;
          }
        }
      }
    }

    console.log("Resumen del seed de cursos:");
    if (createdOrUpdated.length > 0) {
      console.table(createdOrUpdated);
    } else {
      console.log("No hubo cursos nuevos ni actualizados; todo estaba al día.");
    }

    console.log(
      `Total combinaciones: ${anios.length * divisiones.length * turnos.length}. ` +
        `Creados: ${summary.created}, Actualizados: ${summary.updated}, Sin cambios: ${summary.unchanged}`
    );
  } catch (error) {
    console.error("❌ Error ejecutando el seed de cursos:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Conexión a MongoDB cerrada");
  }
}

run();

// models/Student.js
import mongoose from "mongoose";
import {
  normalizeCursoForCompare,
  normalizeForCompare,
} from "../utils/studentFilters.js";

const StudentSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true },
    curso: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      set: (val) => {
        if (typeof val === "string") return val.trim();
        if (typeof val === "number") return val;
        return val;
      },
    },
    division: { type: String, required: true, trim: true },
    codigo: {
      type: String,
      required: true,
      trim: true,
      set: (val) => (typeof val === "string" ? val.trim().toUpperCase() : val),
    },
    codigoUsado: { type: Boolean, default: false },
    // Campo auxiliar con el curso normalizado para filtrar por distintas variantes.
    cursoComparable: { type: String, index: true },
    // Campo auxiliar con la división normalizada en minúsculas y sin tildes.
    divisionComparable: { type: String, index: true },
  },
  { timestamps: true, toJSON: { getters: true }, toObject: { getters: true } },
);

StudentSchema.path("codigo").validate((value) => {
  if (typeof value !== "string") return false;
  return /^[A-Z]{3}-\d{2}-\d{3}$/.test(value.trim());
}, "Formato de código inválido");

// Búsqueda rápida por nombre (case-insensitive)
StudentSchema.index({ nombre: "text" });
StudentSchema.index({ codigo: 1 }, { unique: true });

function assignComparableFields(doc) {
  if (doc.isModified("curso") || doc.isNew) {
    doc.cursoComparable = normalizeCursoForCompare(doc.curso);
  }

  if (doc.isModified("division") || doc.isNew) {
    doc.divisionComparable = normalizeForCompare(doc.division);
  }
}

StudentSchema.pre("save", function setComparableOnSave(next) {
  assignComparableFields(this);
  next();
});

function ensureComparableOnUpdate(update) {
  if (!update) return;

  if (update.$set) {
    if (Object.prototype.hasOwnProperty.call(update.$set, "curso")) {
      update.$set.cursoComparable = normalizeCursoForCompare(update.$set.curso);
    }
    if (Object.prototype.hasOwnProperty.call(update.$set, "division")) {
      update.$set.divisionComparable = normalizeForCompare(update.$set.division);
    }
  }

  if (Object.prototype.hasOwnProperty.call(update, "curso")) {
    update.$set = update.$set || {};
    update.$set.curso = update.curso;
    update.$set.cursoComparable = normalizeCursoForCompare(update.curso);
    delete update.curso;
  }

  if (Object.prototype.hasOwnProperty.call(update, "division")) {
    update.$set = update.$set || {};
    update.$set.division = update.division;
    update.$set.divisionComparable = normalizeForCompare(update.division);
    delete update.division;
  }

  if (update.$unset) {
    if (Object.prototype.hasOwnProperty.call(update.$unset, "curso")) {
      update.$set = update.$set || {};
      update.$set.cursoComparable = "";
    }
    if (Object.prototype.hasOwnProperty.call(update.$unset, "division")) {
      update.$set = update.$set || {};
      update.$set.divisionComparable = "";
    }
  }
}

StudentSchema.pre("findOneAndUpdate", function setComparableOnFindOneAndUpdate(next) {
  ensureComparableOnUpdate(this.getUpdate());
  next();
});

StudentSchema.pre("updateOne", function setComparableOnUpdateOne(next) {
  ensureComparableOnUpdate(this.getUpdate());
  next();
});

StudentSchema.pre("updateMany", function setComparableOnUpdateMany(next) {
  ensureComparableOnUpdate(this.getUpdate());
  next();
});

StudentSchema.pre("findByIdAndUpdate", function setComparableOnFindByIdAndUpdate(next) {
  ensureComparableOnUpdate(this.getUpdate());
  next();
});

export default mongoose.models.Student || mongoose.model("Student", StudentSchema, "estudiantes");

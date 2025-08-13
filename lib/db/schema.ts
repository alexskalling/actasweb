import {
  pgTable,
  uuid,
  text,
  timestamp,
  bigint,
  serial,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import {
  relations
} from "drizzle-orm";

export type DetalleError = {
  event_category: string;
  event_label: string;
  transaction_id: string;
  file_name: string;
  duration: string | number;
  error_message: string;
};
// Tabla: estados_proceso
export const estadosProceso = pgTable("estados_proceso", {
  id: bigint("id_estado_proceso", { mode: "number" })
    .primaryKey()
    .notNull(),
  fechaCreacion: timestamp("fecha_creacion_estado_proceso", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
  nombre: text("nombre_estado_proceso"),
});

export const estadosProcesoRelations = relations(estadosProceso, ({ many }) => ({
  actas: many(actas), // relación 1:N hacia actas
}));

// Tabla: usuarios
export const usuarios = pgTable("usuarios", {
  id: uuid("id_usuario").primaryKey().notNull().defaultRandom(),
  fechaCreacion: timestamp("fecha_creacion_usuario", { withTimezone: true })
    .notNull()
    .defaultNow(),
  nombre: text("nombre_usuario"),
  email: text("email_usuario"),
  telefono: text("telefono_usuario"),
  ultimoAcceso: timestamp("ultimo_acceso"),
});

export const usuariosRelations = relations(usuarios, ({ many }) => ({
  actas: many(actas), // relación 1:N hacia actas
}));

// Tabla: actas
export const actas = pgTable("actas", {
  id: uuid("id_acta").primaryKey().notNull().defaultRandom(),
  fechaProcesamiento: timestamp("fecha_procesamiento_acta", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
  nombre: text("nombre_acta").unique(),
  urlAssembly: text("url_assembly_acta"),
  tx: text("tx_acta"),
  duracion: text("duracion_acta"),
  referencia: text("referencia_acta"),
  costo: text("costo_acta"),
  urlTranscripcion: text("url_transcripcion_acta"),
  urlBorrador: text("url_borrador_acta"),
  idEstadoProceso: bigint("id_estado_proceso_acta", { mode: "number" })
    .default(1)
    .references(() => estadosProceso.id),
  idUsuario: uuid("id_usuario")
    .defaultRandom() // Puedes cambiar esto si usas auth.uid()
    .references(() => usuarios.id),
  idIndustria: integer('id_industria').references(() => industrias.id),
});
// Tabla: industrias
export const industrias = pgTable('industrias', {
  id: serial('id_industria').primaryKey(),
  nombre: text('nombre_industria').notNull().unique(),
});

export const fallosActa = pgTable("fallos_acta", {
  id: uuid("id_fallo").primaryKey().notNull().defaultRandom(),
  idActa: uuid("id_acta")
    .notNull()
    .references(() => actas.id, { onDelete: "cascade" }),
  detalleFallo: jsonb("detalle_fallo").$type<DetalleError>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const fallosActaRelations = relations(fallosActa, ({ one }) => ({
  acta: one(actas, {
    fields: [fallosActa.idActa],
    references: [actas.id],
  }),
}));

export const actasRelations = relations(actas, ({ one }) => ({
  estadoProceso: one(estadosProceso, {
    fields: [actas.idEstadoProceso],
    references: [estadosProceso.id],
  }),
  usuario: one(usuarios, {
    fields: [actas.idUsuario],
    references: [usuarios.id],
  }),
  industria: one(industrias, {
    fields: [actas.idIndustria],
    references: [industrias.id],
  }),
}));

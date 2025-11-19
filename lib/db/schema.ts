import {
  pgTable,
  uuid,
  text,
  timestamp,
  bigint,
  serial,
  integer,
  jsonb,
  boolean,
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
  rol: integer("rol").notNull(),
  // Campos de facturación
  apellido: text("apellido_usuario"),
  direccion: text("direccion_usuario"),
  departamento: text("departamento_usuario"),
  municipio: text("municipio_usuario"),
  pais: text("pais_usuario").default("Colombia"),
  tieneDatosFacturacion: integer("tiene_datos_facturacion_usuario"),
  idIndustria: integer("id_industria_usuario").references(() => industrias.id),
  tipoUsuario: text("tipo_usuario").default("natural"), // 'natural' o 'juridica'
  tipoDocumento: text("tipo_documento"), // CC, CE, NIT, TI, PP, NIP
  numeroDocumento: text("numero_documento"),
  codigoReferido: text("codigo_referido"),
});

export const usuariosRelations = relations(usuarios, ({ many }) => ({
  actas: many(actas), // relación 1:N hacia actas
}));

// Tabla: codigos_atencion
export const codigosAtencion = pgTable("codigos_atencion", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  codigo: text("codigo").notNull().unique(),
  saldo: integer("saldo").notNull().default(0),
  reserva: integer("reserva").notNull().default(0),
  descripcion: text("descripcion"),
  estado: boolean("estado").notNull().default(true),
  fechaCreacion: timestamp("fecha_creacion", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

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
  codigoAtencion: text("codigo_atencion"),
  idEstadoProceso: bigint("id_estado_proceso_acta", { mode: "number" })
    .default(1)
    .references(() => estadosProceso.id),
  idUsuario: uuid("id_usuario")
    .defaultRandom() // Puedes cambiar esto si usas auth.uid()
    .references(() => usuarios.id),
  idIndustria: integer('id_industria').references(() => industrias.id),
  codigoReferido: text("codigo_referido"),
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
// Tabla empresas
export const empresas = pgTable("empresas", {
  idEmpresa: uuid("id_empresa").primaryKey().notNull().defaultRandom(),
  nombreEmpresa: text("nombre_empresa").notNull(),
  adminEmpresa: uuid("admin_empresa")
    .notNull()
    .references(() => usuarios.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tabla agentes_empresa
export const agentesEmpresa = pgTable(
  "agentes_empresa",
  {
    empresaId: uuid("empresa_id").primaryKey().notNull()
      .notNull()
      .references(() => empresas.idEmpresa, { onDelete: "cascade" }),
    agenteId: uuid("agente_id").primaryKey().notNull()
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
  });

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

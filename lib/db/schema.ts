import {
  pgTable,
  uuid,
  text,
  timestamp,
  serial,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';


export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  name: text('name').notNull(),
  mail: text('mail').notNull(),
  last_login: timestamp('last_login', { withTimezone: true }),
  phone: text('phone'),
});


export const estatusActa = pgTable('estatus_acta', {
  id: serial('id').primaryKey(), 
  nombre: text('nombre').notNull().unique(),
});


export const actaEstado = pgTable('acta_estado', {
  id: serial('id').primaryKey(),
  user_id: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  estatus_id: serial('estatus_id').notNull().references(() => estatusActa.id),
  transcription: text('transcription'),
  url: text('url'),
  file_name: text('file_name'), 
});

export const userRelations = relations(users, ({ many }) => ({
  actas: many(actaEstado),
}));

export const actaEstadoRelations = relations(actaEstado, ({ one }) => ({
  user: one(users, {
    fields: [actaEstado.user_id],
    references: [users.id],
  }),
  estatus: one(estatusActa, {
    fields: [actaEstado.estatus_id],
    references: [estatusActa.id],
  }),
}));

export const estatusActaRelations = relations(estatusActa, ({ many }) => ({
  actas: many(actaEstado),
}));


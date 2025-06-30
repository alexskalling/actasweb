import { pgTable, text,  uuid, timestamp } from 'drizzle-orm/pg-core';


export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  name: text('name').notNull(),
  mail: text('mail').notNull(),
  last_login: timestamp('last_login', { withTimezone: true }),
  phone: text('phone'),
})








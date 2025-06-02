import { int } from "drizzle-orm/mysql-core";
import { sql, Table } from "drizzle-orm";
import { integer, pgTable, varchar, uuid, timestamp, date, pgEnum, smallint, primaryKey, PgEnum} from "drizzle-orm/pg-core";
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high']);
export const usersTable = pgTable("users", //TODO: REPLACE THIS WITH FIREBASE
    {
  user_id: uuid().default(sql`gen_random_uuid()`).primaryKey().notNull(),
  email: varchar({length:255}).unique().notNull(),
  password_hash: varchar({length:255}).notNull(),
  created_at: timestamp().defaultNow().notNull(),
  updated_at: timestamp().defaultNow().notNull(),
    }
);

export const countryIdsTable = pgTable("country_ids",
    {
    country_id: smallint().primaryKey().notNull(),
    country_name: varchar({length:255}).notNull()
    }
);
export const applicationStatusEnum = pgEnum('application_status',
    [
        "Have not applied",
        "Application sent",
        "On progress",
        "Interview invitation",
        "Accepted",
        "Rejected",
        "Needs follow-up"
      ]
)
export const jobsTable = pgTable("job_applications",
    {
        user_id: varchar().notNull(),
        company_name: varchar({ length: 255 }).notNull(),
        applied_position: varchar({ length: 255 }).notNull(),
        company_address: varchar({ length: 255 }),
        date_applied: date().notNull(),
        country_id: smallint().references(() => countryIdsTable.country_id).notNull(),
        company_website: varchar({ length: 255 }),
        status_id: applicationStatusEnum().notNull(),
        additional_notes: varchar({ length: 255 }),
        created_at: timestamp().defaultNow().notNull(),
        updated_at: timestamp().defaultNow().notNull(),
    }, (table) => ([
        primaryKey({
            name: "pk_job_applications",
            columns: [
                table.user_id,
                table.company_name,
                table.applied_position,
                table.date_applied,
            ]
        })
    ])
);

export const recruiterContactsTable = pgTable("recruiter_contacts",
    {
        user_id: varchar().notNull(),
        name:varchar({length:255}).notNull(),
        company_name: varchar({length:255}).notNull(),
        role_in_company: varchar({length:255}).notNull(),
        phone_number: varchar({length:255}).notNull(),
        contact_email: varchar({length:255}).notNull(),
        linkedin_profile:varchar({length:255}),
        created_at: timestamp().defaultNow().notNull(),
        updated_at: timestamp().defaultNow().notNull(),
    }, (table) => ([
        primaryKey({
            name:"pk_recruiter_contacts", 
            columns:[
                table.user_id,
                table.contact_email
            ]
        })
    ])
)
export const ReminderTable = pgTable("reminders",{
    reminder_id: uuid().default(sql`gen_random_uuid()`).primaryKey().notNull(),
    user_id: varchar().notNull(),
    title: varchar({ length: 255 }).notNull(),
    date: date().notNull(),
    time: varchar({ length: 10 }).notNull(),
    notes: varchar({ length: 255 }),
    priority: priorityEnum().notNull().default('low'),
    created_at: timestamp().defaultNow().notNull(),
})

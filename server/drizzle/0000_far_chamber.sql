CREATE TYPE "public"."application_status" AS ENUM('Have not applied', 'Application sent', 'On progress', 'Interview invitation', 'Accepted', 'Rejected', 'Needs follow-up');--> statement-breakpoint
CREATE TABLE "country_ids" (
	"country_id" smallint PRIMARY KEY NOT NULL,
	"country_name" varchar(255) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_applications" (
	"user_id" uuid NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"applied_position" varchar(255) NOT NULL,
	"company_address" varchar(255),
	"date_applied" date NOT NULL,
	"country_id" smallint NOT NULL,
	"company_website" varchar(255),
	"status_id" "application_status" NOT NULL,
	"additional_notes" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pk_job_applications" PRIMARY KEY("user_id","company_name","applied_position","date_applied")
);
--> statement-breakpoint
CREATE TABLE "recruiter_contacts" (
	"user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"role_in_company" varchar(255) NOT NULL,
	"phone_number" varchar(255) NOT NULL,
	"contact_email" varchar(255) NOT NULL,
	"linkedin_profile" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pk_recruiter_contacts" PRIMARY KEY("user_id","contact_email")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_applications" ADD CONSTRAINT "job_applications_country_id_country_ids_country_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."country_ids"("country_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recruiter_contacts" ADD CONSTRAINT "recruiter_contacts_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;
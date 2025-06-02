var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { usersTable, jobsTable, countryIdsTable, recruiterContactsTable, applicationStatusEnum, ReminderTable } from '../../db/schema.js';
import { NeonDbError } from "@neondatabase/serverless";
import { and, eq } from "drizzle-orm";
export var Priority;
(function (Priority) {
    Priority["LOW"] = "low";
    Priority["MEDIUM"] = "medium";
    Priority["HIGH"] = "high";
})(Priority || (Priority = {}));
export class Repository {
    constructor(db) {
        this.deleteContact = (user_id, contact_email) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.db
                    .delete(recruiterContactsTable)
                    .where(and(eq(recruiterContactsTable.user_id, user_id), eq(recruiterContactsTable.contact_email, contact_email)));
            }
            catch (error) {
                console.log(error);
                throw new Error("An error occured during database call.");
            }
            return;
        });
        this.deleteJob = (user_id, company_name, applied_position, date_applied) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.db
                    .delete(jobsTable)
                    .where(and(eq(jobsTable.user_id, user_id), eq(jobsTable.company_name, company_name), eq(jobsTable.applied_position, applied_position), eq(jobsTable.date_applied, date_applied)));
            }
            catch (error) {
                console.log(error);
                throw new Error("An error occured during database call.");
            }
            return;
        });
        this.getJobs = (user_id) => __awaiter(this, void 0, void 0, function* () {
            try {
                const jobs = yield this.db
                    .select({
                    companyName: jobsTable.company_name,
                    appliedPosition: jobsTable.applied_position,
                    companyAddress: jobsTable.company_address,
                    dateApplied: jobsTable.date_applied,
                    countryId: jobsTable.country_id,
                    companyWebsite: jobsTable.company_website,
                    statusId: jobsTable.status_id,
                    additionalNotes: jobsTable.additional_notes,
                })
                    .from(jobsTable)
                    .where(eq(jobsTable.user_id, user_id));
                return jobs;
            }
            catch (error) {
                console.log(error);
                throw new Error("An error occured during database call.");
            }
        });
        this.getContacts = (user_id) => __awaiter(this, void 0, void 0, function* () {
            try {
                const contacts = yield this.db
                    .select({
                    Name: recruiterContactsTable.name,
                    company: recruiterContactsTable.company_name,
                    role: recruiterContactsTable.role_in_company,
                    phoneNumber: recruiterContactsTable.phone_number,
                    contactEmail: recruiterContactsTable.contact_email,
                    linkedinProfile: recruiterContactsTable.linkedin_profile,
                })
                    .from(recruiterContactsTable)
                    .where(eq(recruiterContactsTable.user_id, user_id));
                return contacts;
            }
            catch (error) {
                console.log(error);
                throw new Error("An error occured during database call.");
            }
        });
        // Add this to your Repository class in server/api/repository/repository.ts
        this.getJobDetails = (user_id, company_name, applied_position, date_applied) => __awaiter(this, void 0, void 0, function* () {
            try {
                const jobDetails = yield this.db
                    .select({
                    companyName: jobsTable.company_name,
                    appliedPosition: jobsTable.applied_position,
                    companyAddress: jobsTable.company_address,
                    dateApplied: jobsTable.date_applied,
                    countryId: jobsTable.country_id,
                    countryName: countryIdsTable.country_name,
                    companyWebsite: jobsTable.company_website,
                    statusId: jobsTable.status_id,
                    additionalNotes: jobsTable.additional_notes,
                    createdAt: jobsTable.created_at,
                    updatedAt: jobsTable.updated_at
                })
                    .from(jobsTable)
                    .leftJoin(countryIdsTable, eq(jobsTable.country_id, countryIdsTable.country_id))
                    .where(and(eq(jobsTable.user_id, user_id), eq(jobsTable.company_name, company_name), eq(jobsTable.applied_position, applied_position), eq(jobsTable.date_applied, date_applied)))
                    .limit(1); // Ensures only one record is returned
                if (jobDetails.length > 0) {
                    return jobDetails[0];
                }
                return null; // Or throw an error if job not found
            }
            catch (error) {
                console.error("Error fetching job details from repository:", error);
                throw new Error("An error occurred during database call for job details.");
            }
        });
        this.postReminder = (userId, title, date, time, notes, priority) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.db
                    .insert(ReminderTable)
                    .values({
                    user_id: userId,
                    title: title,
                    date: date,
                    time: time,
                    notes: notes,
                    priority: priority,
                });
            }
            catch (error) {
                console.log(error);
                throw new Error("An error occurred during database call for posting reminder.");
            }
        });
        this.getReminders = (userId) => __awaiter(this, void 0, void 0, function* () {
            try {
                const reminders = yield this.db
                    .select({
                    reminderId: ReminderTable.reminder_id,
                    title: ReminderTable.title,
                    date: ReminderTable.date,
                    time: ReminderTable.time,
                    notes: ReminderTable.notes,
                    priority: ReminderTable.priority,
                    createdAt: ReminderTable.created_at,
                })
                    .from(ReminderTable)
                    .where(eq(ReminderTable.user_id, userId));
                return reminders;
            }
            catch (error) {
                console.log(error);
                throw new Error("An error occurred during database call for fetching reminders.");
            }
        });
        this.deleteReminder = (userId, reminderId) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.db
                    .delete(ReminderTable)
                    .where(and(eq(ReminderTable.user_id, userId), eq(ReminderTable.reminder_id, reminderId)));
            }
            catch (error) {
                console.log(error);
                throw new Error("An error occurred during database call for deleting reminder.");
            }
        });
        this.db = db;
    }
    postSubmitJob(user_id, company_name, applied_position, company_address, date_applied, country_id, company_website, status_id, additional_notes) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.db
                    .insert(jobsTable)
                    .values({
                    user_id: user_id,
                    company_name: company_name,
                    applied_position: applied_position,
                    company_address: company_address,
                    date_applied: date_applied,
                    country_id: country_id,
                    company_website: company_website,
                    status_id: applicationStatusEnum.enumValues[status_id],
                    additional_notes: additional_notes
                });
            }
            catch (error) {
                console.log(error);
                throw new Error("An error occured during database call.");
            }
            return;
        });
    }
    postSubmitContact(user_id, role_in_company, phone_number, contact_email, linkedin_profile, name, company_name) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.db
                    .insert(recruiterContactsTable)
                    .values({
                    user_id: user_id,
                    role_in_company: role_in_company,
                    phone_number: phone_number,
                    contact_email: contact_email,
                    linkedin_profile: linkedin_profile,
                    name: name,
                    company_name: company_name
                });
            }
            catch (error) {
                console.log(error);
                throw new Error('An error occured during database call.');
            }
        });
    }
    postLogin(email) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                var queryResult = yield this.db
                    .select({ user_id: usersTable.user_id, password_hash: usersTable.password_hash })
                    .from(usersTable)
                    .where(and(eq(usersTable.email, email)));
            }
            catch (error) {
                throw new Error("An errror occured during the database call.");
            }
            try {
                var user_id = queryResult[0]['user_id'];
            }
            catch (error) {
                throw new Error("Account with such credential is not found.");
            }
            return queryResult;
        });
    }
    postRegister(email, password_hash) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.db
                    .insert(usersTable)
                    .values({
                    email: email,
                    password_hash: password_hash
                });
            }
            catch (error) {
                if (error instanceof NeonDbError) {
                    if (error.code == '23505') {
                        throw new Error("User with that email already exists.");
                    }
                }
                throw new Error('An error occured during the database call.');
            }
            ;
            return;
        });
    }
}
;

import { NeonQueryFunction } from "@neondatabase/serverless";
import { NeonHttpDatabase } from "drizzle-orm/neon-http";
import {usersTable, jobsTable, countryIdsTable, recruiterContactsTable, applicationStatusEnum, ReminderTable} from '../../db/schema.js'
import { NeonDbError } from "@neondatabase/serverless";
import { and, eq } from "drizzle-orm";

export type DbType = NeonHttpDatabase<Record<string, never>> & {
    $client: NeonQueryFunction<false, false>;
}

export enum Priority {
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high'
}

export class Repository {
    db: DbType;
    constructor(db:DbType){
        this.db=db;
    }
    async postSubmitJob(
        user_id: string,
        company_name: string,
        applied_position: string,
        company_address: string|null,
        date_applied: string,
        country_id: number,
        company_website: string|null,
        status_id: number,
        additional_notes: string|null
    ):Promise<void>{
        try{
        await this.db
            .insert(jobsTable)
            .values({
                user_id:user_id,
                company_name:company_name,
                applied_position: applied_position,
                company_address: company_address,
                date_applied: date_applied,
                country_id: country_id,
                company_website: company_website,
                status_id: applicationStatusEnum.enumValues[status_id],
                additional_notes: additional_notes
            })
        } catch(error){
            console.log(error);
            throw new Error("An error occured during database call.");
        }
        return;
    }
    async postSubmitContact(
        user_id:string,
        role_in_company: string,
        phone_number: string,
        contact_email: string,
        linkedin_profile:string | null,
        name:string,
        company_name:string
    ):Promise<void>{
        try{
            await this.db
            .insert(recruiterContactsTable)
            .values({
                user_id:user_id,
                role_in_company:role_in_company,
                phone_number:phone_number,
                contact_email:contact_email,
                linkedin_profile:linkedin_profile,
                name: name,
                company_name: company_name
            })
        }catch(error){
            console.log(error);
            throw new Error('An error occured during database call.')
        }
    }
    async postLogin(
        email:string, 
    ):Promise<Array<{'user_id':string, 'password_hash':string}>>{
        try{
        var queryResult = await this.db
            .select({user_id:usersTable.user_id, password_hash: usersTable.password_hash})
            .from(usersTable)
            .where(
                and(
                    eq(usersTable.email, email),
                )
            )
        } catch (error){
            throw new Error("An errror occured during the database call.");
        }
        try{
            var user_id = queryResult[0]['user_id']; 
        }
        catch(error){
            throw new Error("Account with such credential is not found.");
        }
        return queryResult;
    }
    async postRegister(
        email:string, 
        password_hash:string):Promise<void>{
        try{
            await this.db
            .insert(usersTable)
            .values({
                email:email,
                password_hash:password_hash
            })
        }

        catch(error){
            if(error instanceof NeonDbError){
                if(error.code == '23505'){
                    throw new Error("User with that email already exists.");
                }
            }
            throw new Error('An error occured during the database call.');
        };
        return ;
    }
    deleteContact = async (user_id: string, contact_email: string): Promise<void> => {
        try{
            await this.db
            .delete(recruiterContactsTable)
            .where(
                and(
                    eq(recruiterContactsTable.user_id, user_id),
                    eq(recruiterContactsTable.contact_email, contact_email)
                )
            );
        } catch(error){
            console.log(error);
            throw new Error("An error occured during database call.");
        }
        return ;
    }
    deleteJob = async (        user_id: string, 
        company_name:string, 
        applied_position:string,
        date_applied:string): Promise<void> => {
        try{
            await this.db
            .delete(jobsTable)
            .where(
                and(
                    eq(jobsTable.user_id, user_id),
                    eq(jobsTable.company_name, company_name),
                    eq(jobsTable.applied_position, applied_position),
                    eq(jobsTable.date_applied, date_applied)
                )
            );
        } catch(error){
            console.log(error);
            throw new Error("An error occured during database call.");
        }
        return ;
    }
    getJobs = async (user_id: string): Promise<Array<any>> => {
        try{
            const jobs = await this.db
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
        } catch(error){
            console.log(error);
            throw new Error("An error occured during database call.");
        }
    };
    getContacts = async (user_id: string): Promise<Array<any>> => {
        try{
            const contacts = await this.db
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
        } catch(error){
            console.log(error);
            throw new Error("An error occured during database call.");
        }
    }
    // Add this to your Repository class in server/api/repository/repository.ts

    getJobDetails = async (
        user_id: string,
        company_name: string,
        applied_position: string,
        date_applied: string
    ): Promise<any | null> => { // Define a more specific type if you have one for a single job
        try {
            const jobDetails = await this.db
                .select({
                    companyName: jobsTable.company_name,
                    appliedPosition: jobsTable.applied_position,
                    companyAddress: jobsTable.company_address,
                    dateApplied: jobsTable.date_applied,
                    countryId: jobsTable.country_id,
                    countryName: countryIdsTable.country_name, // Fetched from join
                    companyWebsite: jobsTable.company_website,
                    statusId: jobsTable.status_id,
                    additionalNotes: jobsTable.additional_notes,
                    createdAt: jobsTable.created_at,
                    updatedAt: jobsTable.updated_at
                })
                .from(jobsTable)
                .leftJoin(countryIdsTable, eq(jobsTable.country_id, countryIdsTable.country_id))
                .where(
                    and(
                        eq(jobsTable.user_id, user_id),
                        eq(jobsTable.company_name, company_name),
                        eq(jobsTable.applied_position, applied_position),
                        eq(jobsTable.date_applied, date_applied)
                    )
                )
                .limit(1); // Ensures only one record is returned

            if (jobDetails.length > 0) {
                return jobDetails[0];
            }
            return null; // Or throw an error if job not found
        } catch (error) {
            console.error("Error fetching job details from repository:", error);
            throw new Error("An error occurred during database call for job details.");
        }
    }
    postReminder = async (        
        userId:string, 
        title:string,
        date: string,
        time: string, 
        notes: string, 
        priority: Priority): Promise<void> => {
        try {
            await this.db
                .insert(ReminderTable)
                .values({
                    user_id: userId,
                    title: title,
                    date: date,
                    time: time,
                    notes: notes,
                    priority: priority,
                });
        } catch (error) {
            console.log(error);
            throw new Error("An error occurred during database call for posting reminder.");
        }
       
    }
    getReminders = async (userId: string): Promise<Array<any>> => {
        try {
            const reminders = await this.db
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
        } catch (error) {
            console.log(error);
            throw new Error("An error occurred during database call for fetching reminders.");
        }
    }
    deleteReminder = async (userId: string, reminderId: string): Promise<void> => {
        try{
            await this.db
                .delete(ReminderTable)
                .where(
                    and(
                        eq(ReminderTable.user_id, userId),
                        eq(ReminderTable.reminder_id, reminderId)
                    )
                );
        } catch (error) {
            console.log(error);
            throw new Error("An error occurred during database call for deleting reminder.");
        }
    }
};
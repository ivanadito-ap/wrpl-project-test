import { Repository } from '../api/repository/repository.js';
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { jobsTable, recruiterContactsTable, usersTable } from '../db/schema.js';
import { jest } from '@jest/globals';
import { eq } from 'drizzle-orm';
let sql_uri = "postgresql://wrpl-dev_owner:npg_P9vIZq4VoBFR@ep-ancient-flower-a8f4kayu-pooler.eastus2.azure.neon.tech/wrpl-dev?sslmode=require";
const sql = neon(sql_uri);
const db = drizzle({ client: sql });
jest.setTimeout(10 * 1000);
var repository = new Repository(db);
beforeAll(async ()=>{
    await db.delete(recruiterContactsTable)
    .catch(() => {
        throw "Cannot clean the contacts table before the test.";
    });
    await db.delete(jobsTable)
    .catch(() => {
        throw "Cannot clean the jobs table before the test.";
    });
    await db.delete(usersTable)
    .catch(() => {
        throw "Cannot clean the user table before the test.";
    });
});
afterAll(async ()=>{
    await db.delete(recruiterContactsTable)
    .catch(() => {
        throw "Cannot clean the contacts table after the test.";
    });
    await db.delete(jobsTable)
    .catch(() => {
        throw "Cannot clean the jobs table after the test.";
    });
    await db.delete(usersTable)
    .catch((error) => {
        console.log(error)
        throw "Cannot clean the user table after the test.";
    });
});
describe("postRegister test", () => {

    // =======================================================================
        test('Registering an account',async ()=>{
            await repository.postRegister("test@gmail.com", "testhash");
            let result = await db
                .select({email:usersTable.email})
                .from(usersTable)
                .where(eq(usersTable.email, 'test@gmail.com'));
            expect(result[0]['email']).toMatch("test@gmail.com");
            try{
                await repository.postRegister("test@gmail.com", "testhash");

                throw new Error("Expected error, but succeed.");
            }
            catch(error){
                // console.log("Caught error:", error); // Debugging step
                expect(error).toBeDefined();
                expect(error.message).toMatch('User with that email already exists'); // Check message

            }
        });

});

describe("postLogin test", ()=>{
    beforeAll(async ()=>{
        try{
        await db
        .insert(usersTable)
        .values({email:"test3@gmail.com", password_hash:"testhash"})
        }
        catch(error){
            console.log(error);
        }
    })

        test("Querying a valid credential",async ()=>{
            expect((await repository.postLogin("test3@gmail.com", "testhash")).length>0).toBe(true);
        });
        test("Querying an account with the wrong password",async ()=>{
            expect(repository.postLogin("test3@gmail.com", "wrongpassword")).rejects.toThrow();
        });
        test("Querying an account that does not exists",async ()=>{
            expect(repository.postLogin("wrong@gmail.com", "testhash")).rejects.toThrow();
        });

});

// =================testing postSubmit contact===================
test("Registering job, contact-info", async ()=>{
    await repository.postRegister("test2gmail.com", "testHash");
    let result = await db
        .select({user_id:usersTable.user_id})
        .from(usersTable);
    let user_id = result[0]['user_id'];
    try{
        await repository.postSubmitJob(
                user_id,
                "Fake company",
                "Cleaning service",
                "Bogor",
                "1989-04-15",
                3,
                "www.aang.dev",
                1,
                null
            ); 
    } catch(error){
        expect(error).toBeUndefined();
    }
    //catching the inserted company
    try{
        result = await db
            .select({company_name: jobsTable.company_name, job_id: jobsTable.job_id})
            .from(jobsTable);
    }
    catch(error){
        expect(error).toBeUndefined();
    }
    expect(result[0]['company_name']).toMatch("Fake company");
    let job_id = result[0]['job_id']
    await repository.postSubmitContact(job_id,"HR", "628123456789", "loremipsum@gmail.com", "linkedin link");
    expect((await db.select().from(recruiterContactsTable)).length > 0).toBe(true);
});
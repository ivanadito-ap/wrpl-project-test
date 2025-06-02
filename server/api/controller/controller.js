// server/api/controller/controller.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Service } from '../service/service.js';
import { z } from "zod";
import 'express-session';
// Corrected: Ensure these imports are at the top level
import { applicationStatusEnum } from '../../db/schema.js'; //
import { countryIds } from '../../db/country_id_seed.js'; //
// Zod Schemas
const sessionSchema = z.object({
    user_id: z.string().nonempty("user_id is required"),
}); //
const postSubmitJobSchema = z.object({
    companyName: z.string().nonempty({ message: "Company name is required." }),
    appliedPosition: z.string().nonempty({ message: "Applied position is required." }),
    companyAddress: z.string().optional(),
    dateApplied: z.string().refine((val) => val && !isNaN(Date.parse(val)), { message: "Valid date of application is required." }),
    country: z.preprocess((val) => {
        if (typeof val === 'string' && val.trim() !== '')
            return parseInt(val, 10);
        if (typeof val === 'number')
            return val;
        return undefined;
    }, z.number({
        required_error: "Country is required.",
        invalid_type_error: "Country must be a valid number."
    })),
    companyWebsite: z.string().url({ message: "Invalid URL format." }).optional().or(z.literal('')),
    status: z.preprocess((val) => {
        if (typeof val === 'string' && val.trim() !== '')
            return parseInt(val, 10);
        if (typeof val === 'number')
            return val;
        return undefined;
    }, z.number({
        required_error: "Status is required.",
        invalid_type_error: "Status must be a valid number."
    })),
    additional_notes: z.string().optional(),
}); //
const postSubmitContactSchema = z.object({
    name: z.string().nonempty("Name is required"),
    companyName: z.string().nonempty("Company name is required"),
    roleInCompany: z.string().nonempty(),
    phoneNumber: z.string().nonempty(),
    contactEmail: z.string().email(),
    linkedinProfile: z.string().url({ message: "Invalid URL format." }).optional().or(z.literal('')).nullable(), // Allow null from client
}); //
const postLoginSchema = z.object({
    email: z.string().email(),
    password: z.string().nonempty(),
}); //
const postRegisterSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6, { message: "Password must be at least 6 characters long" }),
    confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
}); //
const deleteContactSchema = z.object({
    contactEmail: z.string().email(),
}); //
const deleteJobSchema = z.object({
    companyName: z.string().nonempty(),
    appliedPosition: z.string().nonempty(),
    dateApplied: z.string().refine((val) => val && !isNaN(Date.parse(val)), { message: "Invalid date format for dateApplied" }),
}); //
const postRemindersSchema = z.object({
    title: z.string().nonempty("Title is required"),
    date: z.string().refine((val) => val && !isNaN(Date.parse(val)), { message: "Valid date is required" }),
    time: z.string().nonempty(),
    notes: z.string().nonempty(),
    priority: z.enum(["low", "medium", "high"]), // Transform to match Priority type
}); //
const deleteReminderSchema = z.object({
    reminderId: z.string().uuid("Invalid reminder ID format"),
}); //
export class Controller {
    constructor(db) {
        this.postLogin = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                postLoginSchema.parse(req.body);
                const serviceResponse = yield this.service.postLogin(req.body.email, req.body.password, req);
                if (!serviceResponse.isError && serviceResponse.data) {
                    req.session.user_id = serviceResponse.data.user_id;
                    console.log(`Login successful for ${req.body.email}, redirecting to /`);
                    // For client-side handling that expects JSON, you might prefer:
                    // res.status(200).json({ success: true, message: "Login successful", redirectUrl: "/" });
                    res.redirect('/'); // Current behavior
                    return;
                }
                console.log(`Login failed: ${serviceResponse.message}`);
                // For client-side handling, you might prefer:
                // res.status(serviceResponse.status || 400).json({ success: false, message: serviceResponse.message });
                res.redirect(`/login?error=${encodeURIComponent(serviceResponse.message)}`); // Current behavior
            }
            catch (error) {
                const errorMessage = error instanceof z.ZodError ? error.flatten().fieldErrors : { form: error.message };
                console.log(`Login validation/controller error:`, errorMessage);
                let errorMsgForQuery = "Login validation failed.";
                if (error instanceof z.ZodError) {
                    const fieldErrors = Object.values(error.flatten().fieldErrors).flat().join(' ');
                    if (fieldErrors)
                        errorMsgForQuery = fieldErrors;
                }
                // For client-side handling, you might prefer:
                // res.status(400).json({ success: false, message: errorMsgForQuery, details: errorMessage });
                res.redirect(`/login?error=${encodeURIComponent(errorMsgForQuery)}`); // Current behavior
            }
        });
        this.postRegister = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const validationResult = postRegisterSchema.parse(req.body);
                const serviceResponse = yield this.service.postRegister(validationResult.email, validationResult.password, validationResult.confirmPassword);
                if (!serviceResponse.isError) {
                    console.log(`Registration successful for ${validationResult.email}, redirecting to /login`);
                    // For client-side handling:
                    // res.status(201).json({ success: true, message: "Registration successful. Please login.", redirectUrl: "/login" });
                    res.redirect('/login?message=Registration successful. Please login.'); // Current behavior
                    return;
                }
                console.log(`Registration failed: ${serviceResponse.message}`);
                // For client-side handling:
                // res.status(serviceResponse.status || 400).json({ success: false, message: serviceResponse.message });
                res.redirect(`/register?error=${encodeURIComponent(serviceResponse.message)}`); // Current behavior
            }
            catch (error) {
                const errorMessage = error instanceof z.ZodError ? error.flatten().fieldErrors : { form: error.message };
                console.log(`Registration validation/controller error:`, errorMessage);
                let errorMsgForQuery = "Registration validation failed.";
                if (error instanceof z.ZodError) {
                    const fieldErrors = Object.values(error.flatten().fieldErrors).flat().join(' ');
                    if (fieldErrors)
                        errorMsgForQuery = fieldErrors;
                }
                // For client-side handling:
                // res.status(400).json({ success: false, message: errorMsgForQuery, details: errorMessage });
                res.redirect(`/register?error=${encodeURIComponent(errorMsgForQuery)}`); // Current behavior
            }
        });
        this.postSubmitJob = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                sessionSchema.parse(req.session); // Check session first
                const validationResult = postSubmitJobSchema.safeParse(req.body);
                if (!validationResult.success) {
                    const errors = validationResult.error.flatten().fieldErrors;
                    console.error("Job submission Zod validation failed:", errors);
                    // If the form is submitted via client-side JS expecting JSON:
                    // return res.status(400).json({ message: "Validation failed. Please check your input.", errors: errors, formData: req.body });
                    // Current behavior (renders page - assumes traditional form post or client-side handling of HTML response for errors)
                    res.status(400).render("forms/job-info-form", {
                        title: "Add New Job Application - Error",
                        countries: countryIds,
                        statuses: applicationStatusEnum.enumValues,
                        formData: req.body,
                        errors: errors,
                        message: "Validation failed. Please check your input."
                    });
                    return;
                }
                const data = validationResult.data;
                const serviceResponse = yield this.service.postSubmitJob(req.session.user_id, data.companyName, data.appliedPosition, data.companyAddress || null, data.dateApplied, String(data.country), // Ensure country is passed as string if service expects number it will convert
                data.companyWebsite || null, String(data.status), // Ensure status is passed as string if service expects number it will convert
                data.additional_notes || null);
                if (!serviceResponse.isError) {
                    console.log(`Job "${data.appliedPosition}" at "${data.companyName}" submitted successfully. Redirecting to /.`);
                    // If client-side JS expects JSON:
                    // return res.status(201).json({ message: "Job submitted successfully", redirectUrl: "/" });
                    res.redirect('/'); // Current behavior
                    return;
                }
                console.error(`Service error submitting job: ${serviceResponse.message}`);
                // If client-side JS expects JSON:
                // return res.status(serviceResponse.status || 500).json({ message: serviceResponse.message || "Could not submit job application due to a server error.", errors: { form: serviceResponse.message }, formData: req.body });
                // Current behavior (renders page)
                res.status(serviceResponse.status || 500).render("forms/job-info-form", {
                    title: "Add New Job Application - Error",
                    countries: countryIds,
                    statuses: applicationStatusEnum.enumValues,
                    formData: req.body,
                    errors: { form: serviceResponse.message },
                    message: serviceResponse.message || "Could not submit job application due to a server error."
                });
            }
            catch (error) {
                console.error(`Unexpected error in postSubmitJob:`, error);
                if (error instanceof z.ZodError && error.issues.some(issue => issue.path.includes('user_id'))) {
                    // If client-side JS expects JSON:
                    // return res.status(401).json({ message: "Unauthorized. Please login." });
                    res.status(401).render("error", { message: "Unauthorized. Please login." }); // Current behavior
                }
                else {
                    // If client-side JS expects JSON:
                    // return res.status(500).json({ message: "An unexpected error occurred.", errors: { form: "An unexpected error occurred." }, formData: req.body });
                    // Current behavior (renders page)
                    res.status(500).render("forms/job-info-form", {
                        title: "Add New Job Application - Error",
                        countries: countryIds,
                        statuses: applicationStatusEnum.enumValues,
                        formData: req.body,
                        errors: { form: "An unexpected error occurred." },
                        message: "An unexpected error occurred."
                    });
                }
            }
        });
        this.postSubmitContact = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                sessionSchema.parse(req.session); // Check session first
                const validationResult = postSubmitContactSchema.safeParse(req.body);
                if (!validationResult.success) {
                    const errors = validationResult.error.flatten().fieldErrors;
                    console.error("Contact submission Zod validation failed:", errors);
                    // Return JSON for client-side handling in contact-form.ejs
                    res.status(400).json({
                        message: "Validation failed. Please check your input.",
                        details: errors,
                        errorType: "Validation"
                    });
                    return;
                }
                const data = validationResult.data;
                const serviceResponse = yield this.service.postSubmitContact(req.session.user_id, data.roleInCompany, data.phoneNumber, data.contactEmail, data.linkedinProfile || null, data.name, data.companyName);
                if (!serviceResponse.isError) {
                    console.log(`Contact "${data.name}" submitted successfully.`);
                    // Return JSON for client-side handling
                    res.status(201).json({ message: 'Contact submitted successfully' });
                    return;
                }
                // Service error
                console.error(`Service error submitting contact: ${serviceResponse.message}`);
                // Return JSON for client-side handling
                res.status(serviceResponse.status || 500).json({
                    message: serviceResponse.message || "Could not submit contact due to a server error.",
                    errorType: "Service"
                });
            }
            catch (error) {
                console.error(`Unexpected error in postSubmitContact:`, error);
                if (error instanceof z.ZodError && error.issues.some(issue => issue.path.includes('user_id'))) {
                    res.status(401).json({ message: "Unauthorized. Please login.", errorType: "Authentication" });
                }
                else {
                    // Catch-all for other unexpected errors
                    res.status(500).json({
                        message: "An unexpected error occurred while submitting the contact.",
                        errorType: "Server"
                    });
                }
            }
        });
        this.deleteLogout = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (req.session && req.session.user_id) {
                    req.session.destroy((err) => {
                        if (err) {
                            console.error('Failed to destroy session during logout:', err);
                            res.status(500).json({ success: false, message: 'Logout failed due to server error.' });
                        }
                        else {
                            console.log('User logged out successfully, session destroyed.');
                            res.clearCookie('connect.sid');
                            res.status(200).json({ success: true, message: 'Logged out successfully. Redirecting...' });
                        }
                    });
                }
                else {
                    console.log('Logout attempt with no active session.');
                    res.status(200).json({ success: true, message: 'No active session to log out from. Redirecting...' });
                }
            }
            catch (error) {
                console.error('Error during logout process:', error);
                res.status(500).json({ success: false, message: "Error during logout process.", details: error.message });
            }
        });
        this.deleteContactAPI = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                sessionSchema.parse(req.session);
                const validationResult = deleteContactSchema.parse(req.body);
                const serviceResponse = yield this.service.deleteContact(req.session.user_id, validationResult.contactEmail);
                console.log(serviceResponse.message);
                res.status(serviceResponse.status).json({ message: serviceResponse.message });
            }
            catch (error) {
                if (error instanceof z.ZodError && error.issues.some(issue => issue.path.includes('user_id'))) {
                    res.status(401).json({ message: "Unauthorized or invalid session." });
                }
                else if (error instanceof z.ZodError) {
                    res.status(400).json({ message: "Invalid request data.", details: error.flatten().fieldErrors });
                }
                else {
                    console.error("Error in deleteContactAPI:", error);
                    res.status(500).json({ message: "Server error deleting contact." });
                }
            }
        });
        this.deleteJobAPI = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                sessionSchema.parse(req.session);
                const validationResult = deleteJobSchema.parse(req.body);
                const serviceResponse = yield this.service.deleteJob(req.session.user_id, validationResult.companyName, validationResult.appliedPosition, validationResult.dateApplied);
                console.log(serviceResponse.message);
                res.status(serviceResponse.status).json({ message: serviceResponse.message });
            }
            catch (error) {
                if (error instanceof z.ZodError && error.issues.some(issue => issue.path.includes('user_id'))) {
                    res.status(401).json({ message: "Unauthorized or invalid session." });
                }
                else if (error instanceof z.ZodError) {
                    res.status(400).json({ message: "Invalid request data.", details: error.flatten().fieldErrors });
                }
                else {
                    console.error("Error in deleteJobAPI:", error);
                    res.status(500).json({ message: "Server error deleting job." });
                }
            }
        });
        this.getJobsAPI = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                sessionSchema.parse(req.session);
                const serviceResponse = yield this.service.getJobs(req.session.user_id);
                res.status(serviceResponse.status).json({ message: serviceResponse.message, data: serviceResponse.data });
            }
            catch (error) {
                if (error instanceof z.ZodError) { // This implies session validation failed
                    res.status(401).json({ message: "Unauthorized or invalid session." });
                }
                else {
                    console.error("Error in getJobsAPI:", error);
                    res.status(500).json({ message: "Server error fetching jobs." });
                }
            }
        });
        this.getContactsAPI = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                sessionSchema.parse(req.session);
                const serviceResponse = yield this.service.getContacts(req.session.user_id);
                res.status(serviceResponse.status).json({ message: serviceResponse.message, data: serviceResponse.data });
            }
            catch (error) {
                if (error instanceof z.ZodError) { // This implies session validation failed
                    res.status(401).json({ message: "Unauthorized or invalid session." });
                }
                else {
                    console.error("Error in getContactsAPI:", error);
                    res.status(500).json({ message: "Server error fetching contacts." });
                }
            }
        });
        this.renderJobDetailPage = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                sessionSchema.parse(req.session);
                const user_id = req.session.user_id;
                const { companyName, appliedPosition, dateApplied } = req.query;
                if (!companyName || !appliedPosition || !dateApplied ||
                    typeof companyName !== 'string' ||
                    typeof appliedPosition !== 'string' ||
                    typeof dateApplied !== 'string') {
                    res.status(400).render("error", { title: "Error", message: "Missing or invalid job identifiers in query parameters." });
                    return;
                }
                const serviceResponse = yield this.service.getJobDetails(user_id, companyName, appliedPosition, dateApplied);
                if (serviceResponse.isError || !serviceResponse.data) {
                    res.status(serviceResponse.status).render("error", { title: "Error", message: serviceResponse.message || "Job details not found." });
                    return;
                }
                const jobData = Object.assign(Object.assign({}, serviceResponse.data), { statusText: serviceResponse.data.statusId, countryName: serviceResponse.data.countryName || 'N/A' });
                res.render("job-detail", {
                    title: "Job Details",
                    job: jobData,
                    statuses: applicationStatusEnum.enumValues,
                    countries: countryIds
                });
            }
            catch (error) {
                console.error(`Unexpected error in renderJobDetailPage:`, error);
                if (error instanceof z.ZodError && error.issues.some(issue => issue.path.includes('user_id'))) {
                    res.status(401).render("error", { title: "Error", message: "Unauthorized. Please login." });
                }
                else {
                    res.status(500).render("error", { title: "Error", message: "An unexpected error occurred while fetching job details." });
                }
            }
        });
        this.postReminder = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                sessionSchema.parse(req.session);
                var validationResult = postRemindersSchema.parse(req.body);
                if (!validationResult) {
                    return res.status(400).json({ message: "Invalid request data." });
                }
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    return res.status(400).json({ message: "Invalid request data.", details: error.flatten().fieldErrors });
                }
                else if (error instanceof z.ZodError && error.issues.some(issue => issue.path.includes('user_id'))) {
                    return res.status(401).json({ message: "Unauthorized or invalid session." });
                }
                else {
                    console.error("Error in postReminder:", error);
                    return res.status(500).json({ message: "Server error posting reminder." });
                }
            }
            const serviceResponse = yield this.service.postReminder(req.session.user_id, validationResult.title, validationResult.date, validationResult.time, validationResult.notes, validationResult.priority // Map string to Priority enum
            );
            if (serviceResponse.isError) {
                console.error("Service error posting reminder:", serviceResponse.message);
                return res.status(serviceResponse.status).json({ mezssage: serviceResponse.message });
            }
            else {
                console.log("Reminder posted successfully:", serviceResponse.message);
                return res.status(serviceResponse.status).json({ message: serviceResponse.message });
            }
        });
        this.getReminders = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                sessionSchema.parse(req.session);
                const userId = req.session.user_id;
                const serviceResponse = yield this.service.getReminders(userId);
                res.status(serviceResponse.status).json({ message: serviceResponse.message, data: serviceResponse.data });
            }
            catch (error) {
                if (error instanceof z.ZodError && error.issues.some(issue => issue.path.includes('user_id'))) {
                    res.status(401).json({ message: "Unauthorized or invalid session." });
                }
                else {
                    console.error("Error in getReminders:", error);
                    res.status(500).json({ message: "Server error fetching reminders." });
                }
            }
        });
        this.deleteReminder = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                sessionSchema.parse(req.session);
                const validationResult = deleteReminderSchema.parse(req.body);
                const serviceResponse = yield this.service.deleteReminder(req.session.user_id, validationResult.reminderId);
                console.log(serviceResponse.message);
                res.status(serviceResponse.status).json({ message: serviceResponse.message });
            }
            catch (error) {
                if (error instanceof z.ZodError && error.issues.some(issue => issue.path.includes('user_id'))) {
                    res.status(401).json({ message: "Unauthorized or invalid session." });
                }
                else if (error instanceof z.ZodError) {
                    res.status(400).json({ message: "Invalid request data.", details: error.flatten().fieldErrors });
                }
                else {
                    console.error("Error in deleteReminder:", error);
                    res.status(500).json({ message: "Server error deleting reminder." });
                }
            }
        });
        this.service = new Service(db);
    }
}

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
import { applicationStatusEnum } from '../../db/schema.js';
import { countryIds } from '../../db/country_id_seed.js';
// Zod Schemas
const sessionSchema = z.object({
    user_id: z.string().nonempty("user_id is required"),
});
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
});
const postSubmitContactSchema = z.object({
    name: z.string().nonempty("Name is required"),
    companyName: z.string().nonempty("Company name is required"),
    roleInCompany: z.string().nonempty(),
    phoneNumber: z.string().nonempty(),
    contactEmail: z.string().email(),
    linkedinProfile: z.string().url({ message: "Invalid URL format." }).optional().or(z.literal('')),
});
const postLoginSchema = z.object({
    email: z.string().email(),
    password: z.string().nonempty(),
});
const postRegisterSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6, { message: "Password must be at least 6 characters long" }),
    confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});
const deleteContactSchema = z.object({
    contactEmail: z.string().email(),
});
const deleteJobSchema = z.object({
    companyName: z.string().nonempty(),
    appliedPosition: z.string().nonempty(),
    dateApplied: z.string().refine((val) => val && !isNaN(Date.parse(val)), { message: "Invalid date format for dateApplied" }),
});
export class Controller {
    constructor(db) {
        this.postLogin = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                postLoginSchema.parse(req.body);
                const serviceResponse = yield this.service.postLogin(req.body.email, req.body.password, req);
                if (!serviceResponse.isError && serviceResponse.data) {
                    req.session.user_id = serviceResponse.data.user_id;
                    console.log(`Login successful for ${req.body.email}, redirecting to /`);
                    res.redirect('/');
                    return;
                }
                console.log(`Login failed: ${serviceResponse.message}`);
                res.redirect(`/login?error=${encodeURIComponent(serviceResponse.message)}`);
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
                res.redirect(`/login?error=${encodeURIComponent(errorMsgForQuery)}`);
            }
        });
        this.postRegister = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const validationResult = postRegisterSchema.parse(req.body);
                const serviceResponse = yield this.service.postRegister(validationResult.email, validationResult.password, validationResult.confirmPassword);
                if (!serviceResponse.isError) {
                    console.log(`Registration successful for ${validationResult.email}, redirecting to /login`);
                    res.redirect('/login?message=Registration successful. Please login.');
                    return;
                }
                console.log(`Registration failed: ${serviceResponse.message}`);
                res.redirect(`/register?error=${encodeURIComponent(serviceResponse.message)}`);
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
                res.redirect(`/register?error=${encodeURIComponent(errorMsgForQuery)}`);
            }
        });
        this.postSubmitJob = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                sessionSchema.parse(req.session);
                const validationResult = postSubmitJobSchema.safeParse(req.body);
                if (!validationResult.success) {
                    const errors = validationResult.error.flatten().fieldErrors;
                    console.error("Job submission Zod validation failed:", errors);
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
                const serviceResponse = yield this.service.postSubmitJob(req.session.user_id, data.companyName, data.appliedPosition, data.companyAddress || null, data.dateApplied, String(data.country), data.companyWebsite || null, String(data.status), data.additional_notes || null);
                if (!serviceResponse.isError) {
                    console.log(`Job "${data.appliedPosition}" at "${data.companyName}" submitted successfully. Redirecting to /.`);
                    res.redirect('/');
                    return;
                }
                console.error(`Service error submitting job: ${serviceResponse.message}`);
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
                    res.status(401).render("error", { message: "Unauthorized. Please login." });
                }
                else {
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
                sessionSchema.parse(req.session);
                const validationResult = postSubmitContactSchema.safeParse(req.body);
                if (!validationResult.success) {
                    const errors = validationResult.error.flatten().fieldErrors;
                    console.error("Contact submission Zod validation failed:", errors);
                    res.status(400).render("forms/contact-form", {
                        title: "Add New Contact - Error",
                        formData: req.body,
                        errors: errors,
                        message: "Validation failed. Please check your input."
                    });
                    return;
                }
                const data = validationResult.data;
                const serviceResponse = yield this.service.postSubmitContact(req.session.user_id, data.roleInCompany, data.phoneNumber, data.contactEmail, data.linkedinProfile || null, data.name, data.companyName);
                if (!serviceResponse.isError) {
                    console.log(`Contact "${data.name}" submitted successfully. Redirecting to /contacts.`);
                    res.redirect('/contacts');
                    return;
                }
                console.error(`Service error submitting contact: ${serviceResponse.message}`);
                res.status(serviceResponse.status || 500).render("forms/contact-form", {
                    title: "Add New Contact - Error",
                    formData: req.body,
                    errors: { form: serviceResponse.message },
                    message: serviceResponse.message || "Could not submit contact due to a server error."
                });
            }
            catch (error) {
                console.error(`Unexpected error in postSubmitContact:`, error);
                if (error instanceof z.ZodError && error.issues.some(issue => issue.path.includes('user_id'))) {
                    res.status(401).render("error", { message: "Unauthorized. Please login." });
                }
                else {
                    res.status(500).render("forms/contact-form", {
                        title: "Add New Contact - Error",
                        formData: req.body,
                        errors: { form: "An unexpected error occurred." },
                        message: "An unexpected error occurred."
                    });
                }
            }
        });
        // MODIFIED: deleteLogout to return JSON
        this.deleteLogout = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (req.session && req.session.user_id) {
                    req.session.destroy((err) => {
                        if (err) {
                            console.error('Failed to destroy session during logout:', err);
                            // Send JSON error response
                            res.status(500).json({ success: false, message: 'Logout failed due to server error.' });
                        }
                        else {
                            console.log('User logged out successfully, session destroyed.');
                            res.clearCookie('connect.sid');
                            // Send JSON success response; client will handle redirect
                            res.status(200).json({ success: true, message: 'Logged out successfully. Redirecting...' });
                        }
                    });
                }
                else {
                    console.log('Logout attempt with no active session.');
                    // Send JSON response; client will handle redirect
                    res.status(200).json({ success: true, message: 'No active session to log out from. Redirecting...' });
                }
            }
            catch (error) {
                console.error('Error during logout process:', error);
                // Send JSON error response
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
                if (error instanceof z.ZodError) {
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
                if (error instanceof z.ZodError) {
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
                if (error instanceof z.ZodError) {
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
                if (error instanceof z.ZodError) {
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
        this.service = new Service(db);
    }
}

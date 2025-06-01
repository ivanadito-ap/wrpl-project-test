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
// Zod Schemas
const sessionSchema = z.object({
    user_id: z.string().nonempty("user_id is required"),
});
const postSubmitJobSchema = z.object({
    companyName: z.string().nonempty({ message: "Company name is required." }),
    appliedPosition: z.string().nonempty({ message: "Applied position is required." }),
    companyAddress: z.string().optional(),
    dateApplied: z.string().refine((val) => val && !isNaN(Date.parse(val)), { message: "Valid date of application is required." }),
    // MODIFIED: Added z.preprocess to handle potential string inputs for country and status
    country: z.preprocess((val) => {
        if (typeof val === 'string' && val.trim() !== '')
            return parseInt(val, 10);
        if (typeof val === 'number')
            return val;
        return undefined; // Let z.number handle 'undefined' to trigger required_error
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
        return undefined; // Let z.number handle 'undefined'
    }, z.number({
        required_error: "Status is required.",
        invalid_type_error: "Status must be a valid number."
    })),
    // END MODIFICATION
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
                res.status(serviceResponse.status).json({ message: serviceResponse.message });
            }
            catch (error) {
                const errorMessage = error instanceof z.ZodError ? error.flatten().fieldErrors : { form: error.message };
                console.log(`Login validation/controller error:`, errorMessage);
                res.status(400).json({ message: "Login validation failed", details: errorMessage });
            }
        });
        this.postRegister = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                const validationResult = postRegisterSchema.parse(req.body);
                const serviceResponse = yield this.service.postRegister(validationResult.email, validationResult.password, validationResult.confirmPassword);
                if (!serviceResponse.isError) {
                    console.log(`Registration successful for ${validationResult.email}, redirecting to /login`);
                    res.redirect('/login');
                    return;
                }
                console.log(`Registration failed: ${serviceResponse.message}`);
                res.status(serviceResponse.status).json({ message: serviceResponse.message });
            }
            catch (error) {
                const errorMessage = error instanceof z.ZodError ? error.flatten().fieldErrors : { form: error.message };
                console.log(`Registration validation/controller error:`, errorMessage);
                res.status(400).json({ message: "Registration validation failed", details: errorMessage });
            }
        });
        this.postSubmitJob = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                sessionSchema.parse(req.session);
                const validationResult = postSubmitJobSchema.safeParse(req.body);
                if (!validationResult.success) {
                    const errors = validationResult.error.flatten().fieldErrors;
                    console.error("Job submission Zod validation failed:", errors);
                    res.status(400).json({
                        message: "Validation failed. Please check your input.",
                        details: errors
                    });
                    return;
                }
                const data = validationResult.data; // data.country and data.status are now numbers
                const serviceResponse = yield this.service.postSubmitJob(req.session.user_id, data.companyName, data.appliedPosition, data.companyAddress || null, data.dateApplied, String(data.country), // Service expects string for ID
                data.companyWebsite || null, String(data.status), // Service expects string for ID
                data.additional_notes || null);
                if (!serviceResponse.isError) {
                    console.log(`Job "${data.appliedPosition}" at "${data.companyName}" submitted successfully. Redirecting to /.`);
                    res.redirect('/');
                    return;
                }
                console.error(`Service error submitting job: ${serviceResponse.message}`);
                res.status(serviceResponse.status || 500).json({
                    message: serviceResponse.message || "Could not submit job application due to a server error."
                });
            }
            catch (error) {
                console.error(`Unexpected error in postSubmitJob:`, error);
                if (error instanceof z.ZodError) { // This handles sessionSchema parse error
                    res.status(400).json({ message: "Invalid request data.", details: error.flatten().fieldErrors });
                }
                else {
                    next(error);
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
                    res.status(400).json({
                        message: "Validation failed. Please check your input.",
                        details: errors
                    });
                    return;
                }
                const data = validationResult.data;
                const serviceResponse = yield this.service.postSubmitContact(req.session.user_id, data.roleInCompany, data.phoneNumber, data.contactEmail, data.linkedinProfile || null, data.name, data.companyName);
                console.log(serviceResponse.message);
                res.status(serviceResponse.status).json({ message: serviceResponse.message, data: serviceResponse.data });
            }
            catch (error) {
                console.error(`Unexpected error in postSubmitContact:`, error);
                if (error instanceof z.ZodError) {
                    res.status(400).json({ message: "Invalid request data.", details: error.flatten().fieldErrors });
                }
                else {
                    next(error);
                }
            }
        });
        this.deleteLogout = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (req.session && req.session.user_id) {
                    req.session.destroy((err) => {
                        if (err) {
                            console.log('Failed to destroy session during logout:', err);
                            res.status(500).json({ message: 'Logout failed due to server error' });
                        }
                        else {
                            console.log('User logged out successfully, session destroyed.');
                            res.clearCookie('connect.sid');
                            res.status(200).json({ message: 'User logged out successfully' });
                        }
                    });
                }
                else {
                    console.log('Logout attempt with no active session.');
                    res.status(200).json({ message: 'No active session to log out from, but considered logged out.' });
                }
            }
            catch (error) {
                console.log('Error during logout process:', error.message);
                res.status(400).json({ message: "Error during logout", details: error.message });
            }
        });
        this.deleteContact = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
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
                    next(error);
                }
            }
        });
        this.deleteJob = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
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
                    next(error);
                }
            }
        });
        this.getJobs = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                sessionSchema.parse(req.session);
                const serviceResponse = yield this.service.getJobs(req.session.user_id);
                res.status(serviceResponse.status).json({ message: serviceResponse.message, data: serviceResponse.data });
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    res.status(400).json({ message: "Invalid session.", details: error.flatten().fieldErrors });
                }
                else {
                    next(error);
                }
            }
        });
        this.getContacts = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            try {
                sessionSchema.parse(req.session);
                const serviceResponse = yield this.service.getContacts(req.session.user_id);
                res.status(serviceResponse.status).json({ message: serviceResponse.message, data: serviceResponse.data });
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    res.status(400).json({ message: "Invalid session.", details: error.flatten().fieldErrors });
                }
                else {
                    next(error);
                }
            }
        });
        this.service = new Service(db);
    }
}

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
    companyName: z.string().nonempty(),
    appliedPosition: z.string().nonempty(),
    companyAddress: z.string().optional(),
    dateApplied: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format for dateApplied" }), // Ensure it's a valid date string
    country: z.number(), // Frontend sends as number, controller converts to string for service
    companyWebsite: z.string().url().optional().or(z.literal('')), // Allow URL or empty string for optional
    status: z.number(), // Frontend sends as number, controller converts to string for service
    additional_notes: z.string().optional(),
});
const postSubmitContactSchema = z.object({
    name: z.string().nonempty("Name is required"),
    companyName: z.string().nonempty("Company name is required"),
    roleInCompany: z.string().nonempty(),
    phoneNumber: z.string().nonempty(), // Consider more specific validation if needed
    contactEmail: z.string().email(),
    linkedinProfile: z.string().url().optional().or(z.literal('')), // Allow URL or empty string for optional
});
const postLoginSchema = z.object({
    email: z.string().email(),
    password: z.string().nonempty(),
});
const postRegisterSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6, { message: "Password must be at least 6 characters long" }), // Example: min length
    confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"], // Path to field to highlight error
});
const deleteContactSchema = z.object({
    contactEmail: z.string().email(),
});
const deleteJobSchema = z.object({
    companyName: z.string().nonempty(),
    appliedPosition: z.string().nonempty(),
    dateApplied: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date format for dateApplied" }),
});
export class Controller {
    constructor(db) {
        this.postLogin = (req, res) => __awaiter(this, void 0, void 0, function* () {
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
                const errorMessage = error instanceof z.ZodError ? error.errors : { message: error.message };
                console.log(`Login validation/controller error:`, errorMessage);
                res.status(400).json({ message: "Login validation failed", details: errorMessage });
            }
        });
        this.postRegister = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const validationResult = postRegisterSchema.parse(req.body);
                // Password match is now handled by Zod's .refine
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
                const errorMessage = error instanceof z.ZodError ? error.errors : { message: error.message };
                console.log(`Registration validation/controller error:`, errorMessage);
                res.status(400).json({ message: "Registration validation failed", details: errorMessage });
            }
        });
        this.postSubmitJob = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                sessionSchema.parse(req.session);
                const validationResult = postSubmitJobSchema.parse(req.body);
                const serviceResponse = yield this.service.postSubmitJob(req.session.user_id, validationResult.companyName, validationResult.appliedPosition, validationResult.companyAddress || null, // Zod optional gives undefined, service expects null
                validationResult.dateApplied, String(validationResult.country), // Service expects string for ID
                validationResult.companyWebsite || null, // Zod optional gives undefined, service expects null
                String(validationResult.status), // Service expects string for ID
                validationResult.additional_notes || null // Zod optional gives undefined, service expects null
                );
                if (!serviceResponse.isError) {
                    console.log(`Job "${validationResult.appliedPosition}" at "${validationResult.companyName}" submitted successfully. Redirecting to /.`);
                    res.redirect('/');
                    return;
                }
                console.error(`Error submitting job: ${serviceResponse.message}`);
                res.status(serviceResponse.status).json({ message: serviceResponse.message, data: serviceResponse.data });
            }
            catch (error) {
                const errorMessage = error instanceof z.ZodError ? error.errors : { message: error.message };
                console.error(`Job submission validation/controller error:`, errorMessage);
                res.status(400).json({ message: "Job submission validation failed", details: errorMessage });
            }
        });
        this.postSubmitContact = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                sessionSchema.parse(req.session);
                const validationResult = postSubmitContactSchema.parse(req.body);
                const serviceResponse = yield this.service.postSubmitContact(req.session.user_id, validationResult.roleInCompany, validationResult.phoneNumber, validationResult.contactEmail, validationResult.linkedinProfile || null, // Zod optional gives undefined, service expects null
                validationResult.name, validationResult.companyName);
                console.log(serviceResponse.message);
                // For contact submission, usually a JSON response is fine, no redirect needed unless specified
                return res.status(serviceResponse.status).json({ message: serviceResponse.message, data: serviceResponse.data });
            }
            catch (error) {
                const errorMessage = error instanceof z.ZodError ? error.errors : { message: error.message };
                console.error(`Contact submission validation/controller error:`, errorMessage);
                return res.status(400).json({ message: "Contact submission validation failed", details: errorMessage });
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
                            res.clearCookie('connect.sid'); // Ensure cookie is cleared (name might depend on session store config)
                            res.status(200).json({ message: 'User logged out successfully' }); // Client will handle redirect
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
                res.status(400).json({ message: "Error during logout", details: error instanceof z.ZodError ? error.errors : error.message });
            }
        });
        this.deleteContact = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                sessionSchema.parse(req.session);
                deleteContactSchema.parse(req.body);
                const serviceResponse = yield this.service.deleteContact(req.session.user_id, req.body.contactEmail);
                console.log(serviceResponse.message);
                return res.status(serviceResponse.status).json({ message: serviceResponse.message });
            }
            catch (error) {
                const errorMessage = error instanceof z.ZodError ? error.errors : { message: error.message };
                console.error(`Delete contact validation/controller error:`, errorMessage);
                return res.status(400).json({ message: "Delete contact validation failed", details: errorMessage });
            }
        });
        this.deleteJob = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                sessionSchema.parse(req.session);
                deleteJobSchema.parse(req.body);
                const serviceResponse = yield this.service.deleteJob(req.session.user_id, req.body.companyName, req.body.appliedPosition, req.body.dateApplied);
                console.log(serviceResponse.message);
                return res.status(serviceResponse.status).json({ message: serviceResponse.message });
            }
            catch (error) {
                const errorMessage = error instanceof z.ZodError ? error.errors : { message: error.message };
                console.error(`Delete job validation/controller error:`, errorMessage);
                return res.status(400).json({ message: "Delete job validation failed", details: errorMessage });
            }
        });
        this.getJobs = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                sessionSchema.parse(req.session);
                const serviceResponse = yield this.service.getJobs(req.session.user_id);
                // console.log(serviceResponse.message); // Service already logs success/failure
                return res.status(serviceResponse.status).json({ message: serviceResponse.message, data: serviceResponse.data });
            }
            catch (error) {
                const errorMessage = error instanceof z.ZodError ? error.errors : { message: error.message };
                console.error(`Get jobs validation/controller error:`, errorMessage);
                return res.status(400).json({ message: "Get jobs validation failed", details: errorMessage });
            }
        });
        this.getContacts = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                sessionSchema.parse(req.session);
                const serviceResponse = yield this.service.getContacts(req.session.user_id);
                // console.log(serviceResponse.message);
                return res.status(serviceResponse.status).json({ message: serviceResponse.message, data: serviceResponse.data });
            }
            catch (error) {
                const errorMessage = error instanceof z.ZodError ? error.errors : { message: error.message };
                console.error(`Get contacts validation/controller error:`, errorMessage);
                return res.status(400).json({ message: "Get contacts validation failed", details: errorMessage });
            }
        });
        this.service = new Service(db);
    }
}

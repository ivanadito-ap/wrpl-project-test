var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { Repository } from '../repository/repository.js';
import bcrypt from 'bcrypt';
export class Service {
    constructor(db) {
        this.postSubmitJob = (user_id, company_name, applied_position, company_address, date_applied, country_id, company_website, status_id, additional_notes) => __awaiter(this, void 0, void 0, function* () {
            if (!company_address) {
                company_address = null;
            }
            if (!company_website) {
                company_website = null;
            }
            if (!additional_notes) {
                additional_notes = null;
            }
            try {
                yield this.repository.postSubmitJob(user_id, company_name, applied_position, company_address, date_applied, Number(country_id), company_website, Number(status_id), additional_notes);
                return { message: 'Job submitted successfully', status: 201, isError: false, data: null };
            }
            catch (error) {
                return { message: error.message || 'Error submitting job', status: 500, isError: true, data: null };
            }
        });
        this.postSubmitContact = (user_id, role_in_company, phone_number, contact_email, linkedin_profile, name, company_name) => __awaiter(this, void 0, void 0, function* () {
            if (!linkedin_profile) {
                linkedin_profile = null;
            }
            try {
                yield this.repository.postSubmitContact(user_id, role_in_company, phone_number, contact_email, linkedin_profile, name, company_name);
                return { message: 'Contact submitted successfully', status: 201, isError: false, data: null };
            }
            catch (error) {
                return { message: error.message || 'Error submitting contact', status: 500, isError: true, data: null };
            }
        });
        this.postLogin = (email, password, req) => __awaiter(this, void 0, void 0, function* () {
            if (!email || !password) {
                return { message: 'Empty credentials', status: 400, isError: true, data: null };
            }
            try {
                const existingAccount = yield this.repository.postLogin(email);
            }
            catch (error) {
                return { message: error.message || 'Error during login', status: 500, isError: true, data: null };
            }
            try {
                const queryResult = yield this.repository.postLogin(email);
                if (queryResult.length > 0 && (yield bcrypt.compare(password, queryResult[0]['password_hash']))) {
                    req.session.user_id = queryResult[0]['user_id'];
                    const userDetails = { user_id: queryResult[0]['user_id'] };
                    return { message: 'Login successful', status: 200, isError: false, data: userDetails };
                }
                else {
                    return { message: 'Incorrect credentials', status: 401, isError: true, data: null };
                }
            }
            catch (error) {
                return { message: error.message || 'Error during login', status: 500, isError: true, data: null };
            }
        });
        this.postRegister = (email, password, password_confirmation) => __awaiter(this, void 0, void 0, function* () {
            if (!password || !email || !password_confirmation) {
                return { message: 'Empty credentials', status: 400, isError: true, data: null };
            }
            if (password !== password_confirmation) {
                return { message: 'Passwords do not match', status: 400, isError: true, data: null };
            }
            try {
                const salt = yield bcrypt.genSalt(3);
                const password_hash = yield bcrypt.hash(password, salt);
                yield this.repository.postRegister(email, password_hash);
                return { message: 'Account registered successfully', status: 201, isError: false, data: null };
            }
            catch (error) {
                console.error("Error during registration:", error);
                return { message: error.message || 'Error during registration attempt', status: 500, isError: true, data: null };
            }
        });
        this.deleteContact = (user_id, contact_email) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.repository.deleteContact(user_id, contact_email);
                return { message: 'Contact deleted successfully', status: 200, isError: false, data: null };
            }
            catch (error) {
                return { message: error.message || 'Error deleting contact', status: 500, isError: true, data: null };
            }
        });
        this.deleteJob = (user_id, company_name, applied_position, date_applied) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.repository.deleteJob(user_id, company_name, applied_position, date_applied);
                return { message: 'Job deleted successfully', status: 200, isError: false, data: null };
            }
            catch (error) {
                return { message: error.message || 'Error deleting job', status: 500, isError: true, data: null };
            }
        });
        this.getJobs = (user_id) => __awaiter(this, void 0, void 0, function* () {
            try {
                const jobs = yield this.repository.getJobs(user_id);
                return { message: 'success', status: 200, isError: false, data: jobs };
            }
            catch (error) {
                return { message: error.message || 'Error fetching jobs', status: 500, isError: true, data: null };
            }
        });
        this.getContacts = (user_id) => __awaiter(this, void 0, void 0, function* () {
            try {
                const contacts = yield this.repository.getContacts(user_id);
                return { message: 'success', status: 200, isError: false, data: contacts };
            }
            catch (error) {
                return { message: error.message || 'Error fetching contacts', status: 500, isError: true, data: null };
            }
        });
        this.repository = new Repository(db);
    }
    // Add this to your Service class in server/api/service/service.ts
    getJobDetails(user_id, company_name, applied_position, date_applied) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const job = yield this.repository.getJobDetails(user_id, company_name, applied_position, date_applied);
                if (job) {
                    return { message: 'success', status: 200, isError: false, data: job };
                }
                else {
                    return { message: 'Job not found', status: 404, isError: true, data: null };
                }
            }
            catch (error) {
                console.error("Error in service fetching job details:", error);
                return { message: error.message || 'Error fetching job details', status: 500, isError: true, data: null };
            }
        });
    }
}
;

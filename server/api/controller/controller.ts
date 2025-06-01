// server/api/controller/controller.ts

import { Service, ServiceResponse, UserDetails } from '../service/service.js';
import { DbType } from "../repository/repository.js";
import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import 'express-session';

// Corrected: Ensure these imports are at the top level
import { applicationStatusEnum } from '../../db/schema.js';
import { countryIds } from '../../db/country_id_seed.js';

declare module 'express-session' {
  interface SessionData {
    user_id?: string;
  }
}

// Zod Schemas
const sessionSchema = z.object({
  user_id: z.string().nonempty("user_id is required"),
});

const postSubmitJobSchema = z.object({
  companyName: z.string().nonempty({ message: "Company name is required."}),
  appliedPosition: z.string().nonempty({ message: "Applied position is required."}),
  companyAddress: z.string().optional(),
  dateApplied: z.string().refine((val) => val && !isNaN(Date.parse(val)), { message: "Valid date of application is required." }),
  country: z.preprocess(
    (val) => {
      if (typeof val === 'string' && val.trim() !== '') return parseInt(val, 10);
      if (typeof val === 'number') return val;
      return undefined;
    },
    z.number({
      required_error: "Country is required.",
      invalid_type_error: "Country must be a valid number."
    })
  ),
  companyWebsite: z.string().url({ message: "Invalid URL format." }).optional().or(z.literal('')),
  status: z.preprocess(
    (val) => {
      if (typeof val === 'string' && val.trim() !== '') return parseInt(val, 10);
      if (typeof val === 'number') return val;
      return undefined;
    },
    z.number({
      required_error: "Status is required.",
      invalid_type_error: "Status must be a valid number."
    })
  ),
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
  service: Service;
  constructor(db: DbType) {
    this.service = new Service(db);
  }

  postLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      postLoginSchema.parse(req.body);
      const serviceResponse: ServiceResponse<UserDetails> = await this.service.postLogin(req.body.email, req.body.password, req);

      if (!serviceResponse.isError && serviceResponse.data) {
        req.session.user_id = serviceResponse.data.user_id;
        console.log(`Login successful for ${req.body.email}, redirecting to /`);
        res.redirect('/');
        return;
      }
      console.log(`Login failed: ${serviceResponse.message}`);
      // It's better to render an error page or send specific error messages for login failures
      // For now, redirecting back to login with a query parameter for the message
      res.redirect(`/login?error=${encodeURIComponent(serviceResponse.message)}`);
    } catch (error: any) {
      const errorMessage = error instanceof z.ZodError ? error.flatten().fieldErrors : { form: error.message };
      console.log(`Login validation/controller error:`, errorMessage);
      // Construct a user-friendly error message string from Zod errors
      let errorMsgForQuery = "Login validation failed.";
      if (error instanceof z.ZodError) {
          const fieldErrors = Object.values(error.flatten().fieldErrors).flat().join(' ');
          if (fieldErrors) errorMsgForQuery = fieldErrors;
      }
      res.redirect(`/login?error=${encodeURIComponent(errorMsgForQuery)}`);
    }
  };

  postRegister = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validationResult = postRegisterSchema.parse(req.body);

      const serviceResponse: ServiceResponse<null> = await this.service.postRegister(
        validationResult.email,
        validationResult.password,
        validationResult.confirmPassword
      );

      if (!serviceResponse.isError) {
        console.log(`Registration successful for ${validationResult.email}, redirecting to /login`);
        // Optionally, add a success message to the login page
        res.redirect('/login?message=Registration successful. Please login.');
        return;
      }
      console.log(`Registration failed: ${serviceResponse.message}`);
      // Redirect back to register page with error message
      res.redirect(`/register?error=${encodeURIComponent(serviceResponse.message)}`);
    } catch (error: any) {
      const errorMessage = error instanceof z.ZodError ? error.flatten().fieldErrors : { form: error.message };
      console.log(`Registration validation/controller error:`, errorMessage);
      let errorMsgForQuery = "Registration validation failed.";
       if (error instanceof z.ZodError) {
          const fieldErrors = Object.values(error.flatten().fieldErrors).flat().join(' ');
          if (fieldErrors) errorMsgForQuery = fieldErrors;
      }
      res.redirect(`/register?error=${encodeURIComponent(errorMsgForQuery)}`);
    }
  };

  postSubmitJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sessionSchema.parse(req.session);
      const validationResult = postSubmitJobSchema.safeParse(req.body);

      if (!validationResult.success) {
        const errors = validationResult.error.flatten().fieldErrors;
        console.error("Job submission Zod validation failed:", errors);
        // Instead of JSON, re-render the form with errors and existing data
        res.status(400).render("forms/job-info-form", {
            title: "Add New Job Application - Error",
            countries: countryIds, // Make sure countryIds is available
            statuses: applicationStatusEnum.enumValues, // Make sure applicationStatusEnum is available
            formData: req.body, // Pass back the submitted data
            errors: errors,     // Pass the Zod errors
            message: "Validation failed. Please check your input." // General message
        });
        return;
      }

      const data = validationResult.data;

      const serviceResponse = await this.service.postSubmitJob(
        req.session.user_id!,
        data.companyName,
        data.appliedPosition,
        data.companyAddress || null,
        data.dateApplied,
        String(data.country),
        data.companyWebsite || null,
        String(data.status),
        data.additional_notes || null
      );

      if (!serviceResponse.isError) {
        console.log(`Job "${data.appliedPosition}" at "${data.companyName}" submitted successfully. Redirecting to /.`);
        res.redirect('/');
        return;
      }

      console.error(`Service error submitting job: ${serviceResponse.message}`);
      // Re-render form with service error
      res.status(serviceResponse.status || 500).render("forms/job-info-form", {
          title: "Add New Job Application - Error",
          countries: countryIds,
          statuses: applicationStatusEnum.enumValues,
          formData: req.body,
          errors: { form: serviceResponse.message }, // Show service error as a form-level error
          message: serviceResponse.message || "Could not submit job application due to a server error."
      });

    } catch (error:any) {
      console.error(`Unexpected error in postSubmitJob:`, error);
      if (error instanceof z.ZodError && error.issues.some(issue => issue.path.includes('user_id'))) {
        res.status(401).render("error", { message: "Unauthorized. Please login." });
      } else {
        // Render a generic error page or the form with a generic error
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
  };

  postSubmitContact = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sessionSchema.parse(req.session);
      const validationResult = postSubmitContactSchema.safeParse(req.body);

      if (!validationResult.success) {
        const errors = validationResult.error.flatten().fieldErrors;
        console.error("Contact submission Zod validation failed:", errors);
        // Re-render the contact form with errors
        res.status(400).render("forms/contact-form", {
            title: "Add New Contact - Error",
            formData: req.body,
            errors: errors,
            message: "Validation failed. Please check your input."
        });
        return;
      }
      const data = validationResult.data;

      const serviceResponse = await this.service.postSubmitContact(
        req.session.user_id!,
        data.roleInCompany,
        data.phoneNumber,
        data.contactEmail,
        data.linkedinProfile || null,
        data.name,
        data.companyName
      );

      if (!serviceResponse.isError) {
          console.log(`Contact "${data.name}" submitted successfully. Redirecting to /contacts.`);
          res.redirect('/contacts'); // Redirect to contacts list page
          return;
      }
      
      console.error(`Service error submitting contact: ${serviceResponse.message}`);
      res.status(serviceResponse.status || 500).render("forms/contact-form", {
          title: "Add New Contact - Error",
          formData: req.body,
          errors: { form: serviceResponse.message },
          message: serviceResponse.message || "Could not submit contact due to a server error."
      });

    } catch (error:any) {
      console.error(`Unexpected error in postSubmitContact:`, error);
       if (error instanceof z.ZodError && error.issues.some(issue => issue.path.includes('user_id'))) {
        res.status(401).render("error", { message: "Unauthorized. Please login." });
      } else {
        res.status(500).render("forms/contact-form", {
            title: "Add New Contact - Error",
            formData: req.body,
            errors: { form: "An unexpected error occurred." },
            message: "An unexpected error occurred."
        });
      }
    }
  };

  deleteLogout = async (req: Request, res: Response): Promise<void> => {
    try {
      if (req.session && req.session.user_id) {
        req.session.destroy((err) => {
          if (err) {
            console.log('Failed to destroy session during logout:', err);
            // Don't send JSON if it's a page interaction, redirect or render error page
            res.status(500).render("error", { message: "Logout failed due to server error." });
          } else {
            console.log('User logged out successfully, session destroyed.');
            res.clearCookie('connect.sid'); // Ensure the session cookie is cleared
            res.redirect('/login?message=Logged out successfully.');
          }
        });
      } else {
        console.log('Logout attempt with no active session.');
        res.redirect('/login?message=No active session to log out from.');
      }
    } catch (error:any) {
        console.log('Error during logout process:', error.message);
        res.status(400).render("error", { message: "Error during logout", details: error.message });
    }
  };

  // API endpoint for deleting contact (called via fetch from client-side typically)
  deleteContactAPI = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sessionSchema.parse(req.session);
      const validationResult = deleteContactSchema.parse(req.body); // Assuming email is in body

      const serviceResponse = await this.service.deleteContact(
        req.session.user_id!,
        validationResult.contactEmail
      );
      console.log(serviceResponse.message);
      res.status(serviceResponse.status).json({ message: serviceResponse.message });
    } catch (error:any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data.", details: error.flatten().fieldErrors });
      } else {
        console.error("Error in deleteContactAPI:", error);
        res.status(500).json({ message: "Server error deleting contact." });
      }
    }
  };

  // API endpoint for deleting job (called via fetch from client-side typically)
  deleteJobAPI = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sessionSchema.parse(req.session);
      const validationResult = deleteJobSchema.parse(req.body); // Assuming identifiers are in body

      const serviceResponse = await this.service.deleteJob(
        req.session.user_id!,
        validationResult.companyName,
        validationResult.appliedPosition,
        validationResult.dateApplied
      );
      console.log(serviceResponse.message);
      res.status(serviceResponse.status).json({ message: serviceResponse.message });
    } catch (error:any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data.", details: error.flatten().fieldErrors });
      } else {
        console.error("Error in deleteJobAPI:", error);
        res.status(500).json({ message: "Server error deleting job." });
      }
    }
  };

  // API endpoint for getting jobs (called via fetch from client-side)
  getJobsAPI = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sessionSchema.parse(req.session);
      const serviceResponse = await this.service.getJobs(req.session.user_id!);
      res.status(serviceResponse.status).json({ message: serviceResponse.message, data: serviceResponse.data });
    } catch (error:any) {
      if (error instanceof z.ZodError) {
        res.status(401).json({ message: "Unauthorized or invalid session." });
      } else {
        console.error("Error in getJobsAPI:", error);
        res.status(500).json({ message: "Server error fetching jobs." });
      }
    }
  };

  // API endpoint for getting contacts (called via fetch from client-side)
  getContactsAPI = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sessionSchema.parse(req.session);
      const serviceResponse = await this.service.getContacts(req.session.user_id!);
      res.status(serviceResponse.status).json({ message: serviceResponse.message, data: serviceResponse.data });
    } catch (error:any) {
      if (error instanceof z.ZodError) {
        res.status(401).json({ message: "Unauthorized or invalid session." });
      } else {
        console.error("Error in getContactsAPI:", error);
        res.status(500).json({ message: "Server error fetching contacts." });
      }
    }
  };

  // Controller method for rendering the job detail page
  renderJobDetailPage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sessionSchema.parse(req.session);
      const user_id = req.session.user_id!;

      const { companyName, appliedPosition, dateApplied } = req.query;

      if (!companyName || !appliedPosition || !dateApplied ||
          typeof companyName !== 'string' ||
          typeof appliedPosition !== 'string' ||
          typeof dateApplied !== 'string') {
        res.status(400).render("error", { title: "Error", message: "Missing or invalid job identifiers in query parameters." });
        return;
      }

      const serviceResponse = await this.service.getJobDetails(user_id, companyName, appliedPosition, dateApplied);

      if (serviceResponse.isError || !serviceResponse.data) {
        res.status(serviceResponse.status).render("error", { title: "Error", message: serviceResponse.message || "Job details not found." });
        return;
      }
      
      const jobData = {
          ...serviceResponse.data,
          statusText: serviceResponse.data.statusId, 
          countryName: serviceResponse.data.countryName || 'N/A'
      };

      res.render("job-detail", {
          title: "Job Details",
          job: jobData,
          statuses: applicationStatusEnum.enumValues, // Now correctly in scope
          countries: countryIds  // Now correctly in scope
      });

    } catch (error:any) {
      console.error(`Unexpected error in renderJobDetailPage:`, error);
      if (error instanceof z.ZodError && error.issues.some(issue => issue.path.includes('user_id'))) {
        res.status(401).render("error", { title: "Error", message: "Unauthorized. Please login."});
      } else {
        res.status(500).render("error", { title: "Error", message: "An unexpected error occurred while fetching job details."});
      }
    }
  };
}

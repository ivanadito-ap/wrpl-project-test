// server/api/controller/controller.ts

import { Service, ServiceResponse, UserDetails } from '../service/service.js';
import { DbType } from "../repository/repository.js";
import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import 'express-session';

// Note: Imports for countryIds and applicationStatusEnum are removed from here
// as they are only needed if the controller re-renders forms with dropdowns on error.
// For the current setup (JSON errors for fetch, redirect on success), they are not directly used by the controller.

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
  
  // MODIFIED: Added z.preprocess to handle potential string inputs for country and status
  country: z.preprocess(
    (val) => {
      if (typeof val === 'string' && val.trim() !== '') return parseInt(val, 10);
      if (typeof val === 'number') return val;
      return undefined; // Let z.number handle 'undefined' to trigger required_error
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
      return undefined; // Let z.number handle 'undefined'
    },
    z.number({ 
      required_error: "Status is required.", 
      invalid_type_error: "Status must be a valid number." 
    })
  ),
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
      res.status(serviceResponse.status).json({ message: serviceResponse.message });
    } catch (error: any) {
      const errorMessage = error instanceof z.ZodError ? error.flatten().fieldErrors : { form: error.message };
      console.log(`Login validation/controller error:`, errorMessage);
      res.status(400).json({ message: "Login validation failed", details: errorMessage });
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
        res.redirect('/login');
        return;
      }
      console.log(`Registration failed: ${serviceResponse.message}`);
      res.status(serviceResponse.status).json({ message: serviceResponse.message });
    } catch (error: any) {
      const errorMessage = error instanceof z.ZodError ? error.flatten().fieldErrors : { form: error.message };
      console.log(`Registration validation/controller error:`, errorMessage);
      res.status(400).json({ message: "Registration validation failed", details: errorMessage });
    }
  };

  postSubmitJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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

      const serviceResponse = await this.service.postSubmitJob(
        req.session.user_id!,
        data.companyName,
        data.appliedPosition,
        data.companyAddress || null,
        data.dateApplied,
        String(data.country),       // Service expects string for ID
        data.companyWebsite || null,
        String(data.status),        // Service expects string for ID
        data.additional_notes || null
      );
      
      if (!serviceResponse.isError) {
        console.log(`Job "${data.appliedPosition}" at "${data.companyName}" submitted successfully. Redirecting to /.`);
        res.redirect('/'); 
        return; 
      }
      
      console.error(`Service error submitting job: ${serviceResponse.message}`);
      res.status(serviceResponse.status || 500).json({
          message: serviceResponse.message || "Could not submit job application due to a server error."
      });

    } catch (error:any) {
      console.error(`Unexpected error in postSubmitJob:`, error);
      if (error instanceof z.ZodError) { // This handles sessionSchema parse error
        res.status(400).json({ message: "Invalid request data.", details: error.flatten().fieldErrors });
      } else {
        next(error); 
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
        res.status(400).json({
            message: "Validation failed. Please check your input.",
            details: errors
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

      console.log(serviceResponse.message);
      res.status(serviceResponse.status).json({ message: serviceResponse.message, data: serviceResponse.data });
    } catch (error:any) {
      console.error(`Unexpected error in postSubmitContact:`, error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid request data.", details: error.flatten().fieldErrors });
      } else {
        next(error);
      }
    }
  };

  deleteLogout = async (req: Request, res: Response): Promise<void> => {
    try {
      if (req.session && req.session.user_id) {
        req.session.destroy((err) => {
          if (err) {
            console.log('Failed to destroy session during logout:', err);
            res.status(500).json({ message: 'Logout failed due to server error' });
          } else {
            console.log('User logged out successfully, session destroyed.');
            res.clearCookie('connect.sid');
            res.status(200).json({ message: 'User logged out successfully' });
          }
        });
      } else {
        console.log('Logout attempt with no active session.');
        res.status(200).json({ message: 'No active session to log out from, but considered logged out.' });
      }
    } catch (error:any) {
        console.log('Error during logout process:', error.message);
        res.status(400).json({ message: "Error during logout", details: error.message });
    }
  };

  deleteContact = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sessionSchema.parse(req.session);
      const validationResult = deleteContactSchema.parse(req.body);

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
        next(error);
      }
    }
  };

  deleteJob = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sessionSchema.parse(req.session);
      const validationResult = deleteJobSchema.parse(req.body);

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
        next(error);
      }
    }
  };

  getJobs = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sessionSchema.parse(req.session);
      const serviceResponse = await this.service.getJobs(req.session.user_id!);
      res.status(serviceResponse.status).json({ message: serviceResponse.message, data: serviceResponse.data });
    } catch (error:any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid session.", details: error.flatten().fieldErrors });
      } else {
        next(error);
      }
    }
  };

  getContacts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      sessionSchema.parse(req.session);
      const serviceResponse = await this.service.getContacts(req.session.user_id!);
      res.status(serviceResponse.status).json({ message: serviceResponse.message, data: serviceResponse.data });
    } catch (error:any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid session.", details: error.flatten().fieldErrors });
      } else {
        next(error);
      }
    }
  };
}
import express from "express";
import { countryIds } from '../server/db/country_id_seed.js';
import { applicationStatusEnum } from '../server/db/schema.js';
// You'll need to import your controller to use controller.postSubmitJob
// Assuming controller.js is the compiled output if controller.ts is the source
import { Controller } from '../server/api/controller/controller.js'; // Adjust path as necessary
import { neon } from "@neondatabase/serverless"; // For DB connection if controller needs it passed
import { drizzle } from "drizzle-orm/neon-http"; // For DB connection if controller needs it passed
import 'dotenv/config';


const router = express.Router();

// --- Initialize Controller (needs db instance) ---
// This setup assumes DATABASE_URL is in .env
let controller;
if (process.env.DATABASE_URL) {
    const sql = neon(process.env.DATABASE_URL);
    const db = drizzle(sql);
    controller = new Controller(db);
} else {
    console.error("DATABASE_URL not set, controller cannot be initialized for POST route.");
    // Handle this error appropriately, maybe by not defining POST routes or throwing
}


// Authentication Middleware
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user_id) {
    return next();
  } else {
    res.redirect('/login');
  }
};

// --- Public Routes ---
router.get("/register", (req, res) => {
  if (req.session.user_id) return res.redirect('/');
  res.render("forms/register", { title: "Register - JobTrek" });
});

router.get("/login", (req, res) => {
  if (req.session.user_id) return res.redirect('/');
  res.render("forms/login", { title: "Login - JobTrek" });
});

// --- Protected Routes ---
router.get("/open-job-form", isAuthenticated, (req, res) => {
  res.render("forms/job-info-form", {
    title: "Add New Job Application",
    countries: countryIds,
    statuses: applicationStatusEnum.enumValues,
    formData: {}, // Pass empty formData for initial render
    errors: {}    // Pass empty errors for initial render
  });
});

// MODIFICATION: New POST route for direct form submission
router.post("/submit-job-application", isAuthenticated, (req, res, next) => {
    if (!controller) {
        return next(new Error("Controller not initialized for job submission."));
    }
    // The controller.postSubmitJob will handle success (redirect) or error (re-render)
    controller.postSubmitJob(req, res, next); // Pass next for error handling if controller calls it
});


router.get("/contact-page", isAuthenticated, (req, res) => {
  res.render("forms/contact-form", { title: "Add New Contact" });
});

router.get("/contacts", isAuthenticated, (req, res) => {
  res.render("contacts", { title: "My Contacts" });
});

router.get("/reminders", isAuthenticated, (req, res) => {
  res.render("reminders", { title: "My Reminders" });
});

router.get('/documents', isAuthenticated, (req, res) => {
  const query = req.query.query || '';
  const page = parseInt(req.query.page) || 1;
  res.render('documents', {
    title: "My Documents",
    query,
    page
  });
});

router.get("/viewJobDetail", isAuthenticated, controller.renderJobDetailPage);

// Route for displaying contacts page
router.get("/contacts", isAuthenticated, (req, res) => {
  res.render("contacts", { 
    title: "My Contacts" 
    // Contact data will be fetched client-side
  });
});

// Route for the contact form page (to add new contacts)
router.get("/contact-page", isAuthenticated, (req, res) => {
  res.render("forms/contact-form", {
    title: "Add New Contact",
    formData: {}, // For initial render if you plan to reuse for editing
    errors: {}    // For initial render
  });
});

// Your API routes (POST /api/v1/contacts, GET /api/v1/contacts, DELETE /api/v1/contacts)
// are handled in server.js via the controller.
router.get("/viewJobDetail", isAuthenticated, controller.renderJobDetailPage);
export default router;
import express from "express";
// Assuming these paths are correct relative to your routes/router.js file
import { countryIds } from '../server/db/country_id_seed.js';         //
import { applicationStatusEnum } from '../server/db/schema.js';   //

const router = express.Router();

// Authentication Middleware
// In a larger app, you might put this in its own file (e.g., middleware/auth.js) and import it.
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user_id) {
    return next(); // User is authenticated, proceed to the route
  } else {
    res.redirect('/login'); // User is not authenticated, redirect to login
  }
};

// Route for registration page (Public)
router.get("/register", (req, res) => {
  if (req.session.user_id) { // If already logged in
    return res.redirect('/'); // Redirect to dashboard/home
  }
  res.render("forms/register"); // .ejs is optional if view engine is set
});

// Route for login page (Public)
router.get("/login", (req, res) => {
  if (req.session.user_id) { // If already logged in
    return res.redirect('/'); // Redirect to dashboard/home
  }
  res.render("forms/login");
});

// --- Protected Routes (Require Authentication) ---

// Route for the job info form page
router.get("/open-job-form", isAuthenticated, (req, res) => {
  res.render("forms/job-info-form", {
    title: "Add New Job Application", // Optional: Pass a title for the page
    countries: countryIds,
    statuses: applicationStatusEnum.enumValues
  });
});

// Route for the contact form page
router.get("/contact-page", isAuthenticated, (req, res) => {
  res.render("forms/contact-form", {
    title: "Add New Contact" // Optional
  });
});

// Route for displaying contacts
router.get("/contacts", isAuthenticated, (req, res) => {
  // For client-side rendering, just render the page.
  // For server-side, you would fetch contacts here and pass them to the view.
  res.render("contacts", { // Assuming contacts.ejs is directly in 'views'
    title: "My Contacts" // Optional
  });
});

// Route for displaying reminders
router.get("/reminders", isAuthenticated, (req, res) => {
  res.render("reminders", { // Assuming reminders.ejs is directly in 'views'
    title: "My Reminders" // Optional
  });
});

// Route for displaying documents
router.get('/documents', isAuthenticated, (req, res) => {
  const query = req.query.query || '';
  const page = parseInt(req.query.page) || 1;
  res.render('documents', { // Assuming documents.ejs is directly in 'views'
    title: "My Documents", // Optional
    query,
    page
  });
});

// Route for viewing job details
router.get("/viewJobDetail", isAuthenticated, async (req, res) => {
  const { companyName, appliedPosition, dateApplied } = req.query;
  // If you were to fetch job details server-side to pass to the EJS template:
  // try {
  //   // const jobDetails = await someJobService.getDetails(req.session.user_id, companyName, appliedPosition, dateApplied);
  //   // if (!jobDetails) return res.status(404).send("Job not found");
  //   // res.render("job-detail", { job: jobDetails, title: "Job Details" });
  // } catch (error) {
  //   // console.error("Error fetching job details for view:", error);
  //   // res.status(500).send("Error loading job details.");
  // }
  
  // For client-side fetching, just render the template with necessary identifiers
  res.render("job-detail", {
    title: "Job Details", // Optional
    companyName,
    appliedPosition,
    dateApplied
    // Any other data needed by the client-side script on this page can be passed here
  });
});

// Note: The root route "/" is handled in server.js to render index.ejs after authentication.
// If you want all page routes here, you'd move that one from server.js too.

export default router;
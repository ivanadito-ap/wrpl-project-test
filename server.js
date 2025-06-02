import express from "express";
import path from "path";
import session from 'express-session';
import { fileURLToPath } from "url";
import pageRoutes from "./routes/router.js"; // Renamed for clarity
import bodyParser from "body-parser";
import { Controller } from './server/api/controller/controller.js'; // Assuming .js output if original is .ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import 'dotenv/config'; // Ensures .env variables are loaded

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000; // Use environment variable for port

// --- Database Setup ---
// Ensure DATABASE_URL is set in your .env file
if (!process.env.DATABASE_URL) {
  console.error("FATAL ERROR: DATABASE_URL is not set in .env file.");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);
const db = drizzle({ client: sql }); // Pass the Neon client to Drizzle
const controller = new Controller(db);

// --- Middleware ---
app.use(express.static("public"));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// --- Session Configuration ---
// Ensure SESSION_SECRET is set in your .env file
if (!process.env.SESSION_SECRET) {
  console.error("FATAL ERROR: SESSION_SECRET is not set in .env file. Please generate a strong secret.");
  process.exit(1);
}
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (HTTPS)
    httpOnly: true, // Helps prevent XSS
    maxAge: 24 * 60 * 60 * 1000 // Example: 1 day
  }
}));

// --- Authentication Middleware ---
// This middleware can be used to protect routes that require login
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user_id) {
    return next();
  } else {
    // For API routes, you might want to send a 401 status
    if (req.originalUrl.startsWith('/api/v1')) {
      return res.status(401).json({ message: 'Unauthorized. Please login.' });
    }
    // For page routes, redirect to login
    res.redirect('/login');
  }
};

// --- Page Routes (from routes/router.js) ---
// These are typically for rendering EJS views
app.use("/", pageRoutes); // Mounted page routes

// --- Dashboard/Index Route ---
// Protected route: only accessible if logged in
app.get("/", isAuthenticated, (req, res) => {
  // You can fetch user-specific data here to pass to index.ejs if needed
  // For example: const userData = await someService.getUserData(req.session.user_id);
  res.render("index", {
    title: "Dashboard - JobTrek"
    // user: userData // Example: passing user data to the view
  });
});

// --- API Routes ---
// POST routes (assuming these are correct based on your controller.ts)
app.post("/api/v1/login", controller.postLogin);
app.post("/api/v1/register", controller.postRegister);
app.post("/api/v1/jobs", isAuthenticated, controller.postSubmitJob);
app.post("/api/v1/contacts", isAuthenticated, controller.postSubmitContact);
app.post("/api/v1/reminders", isAuthenticated, controller.postReminder);
app.get("/api/v1/reminders", isAuthenticated, controller.getReminders);
app.delete("/api/v1/reminders", isAuthenticated, controller.deleteReminder);


// DELETE routes - Corrected
// The controller.ts in the Canvas defines deleteLogout, deleteContactAPI, and deleteJobAPI.
// Ensure these match the methods available on your compiled controller.js.

// This line (98 in your original error) should work if controller.js is up-to-date
// and controller.deleteLogout is correctly defined and exported.
app.delete("/api/v1/logout", controller.deleteLogout);

// Updated to use the ...API suffixed methods as per your controller.ts for JSON responses
app.delete("/api/v1/contacts", isAuthenticated, controller.deleteContactAPI);
app.delete("/api/v1/jobs", isAuthenticated, controller.deleteJobAPI);
// app.delete("/api/v1/documents", isAuthenticated, controller.deleteDocument); // Example if re-enabled

// GET routes - Assuming these call the ...API suffixed methods for JSON responses
app.get("/api/v1/jobs", isAuthenticated, controller.getJobsAPI);
app.get("/api/v1/contacts", isAuthenticated, controller.getContactsAPI);
// app.get("/api/v1/documents", isAuthenticated, controller.getDocuments); // Example if re-enabled


// --- Basic Error Handling (Very Basic, expand as needed) ---
// Catches errors from synchronous code in routes or if next(err) is called
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.stack || err.message || err);
  // Check if headers have already been sent
  if (res.headersSent) {
    return next(err); // Delegate to default Express error handler
  }
  res.status(err.status || 500).render('error', { // Assuming you have an error.ejs page
    title: "Error",
    message: err.message || "Something went wrong!",
    // Only show stack in dev, ensure NODE_ENV is set appropriately
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// --- 404 Handler (if no routes matched) ---
app.use((req, res, next) => {
  // Check if headers have already been sent
  if (res.headersSent) {
    return next(); // Should not happen if this is the last middleware
  }
  res.status(404).render('404', { title: "Page Not Found", url: req.originalUrl }); // Assuming a 404.ejs page
});


app.listen(port, () => {
  console.log(`JobTrek server running on http://localhost:${port}`);
});

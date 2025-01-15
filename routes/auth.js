const express = require("express");
const { body } = require("express-validator");

const authController = require("../controllers/auth");

const router = express.Router();

router.put(
  "/signup",
  [
    body("name").trim().notEmpty().withMessage("Name is required."),
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email.")
      .normalizeEmail()
      .trim(),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters long.")
      .trim(),
  ],
  authController.Signup
);

router.put("/login", authController.Login);

module.exports = router;

const User = require("../models/users");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "your_jwt_secret";

exports.Signup = async (req, res, next) => {
  const { name, email, password } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: errors.array()[0].msg,
    });
  }

  if (password.trim() === "") {
    return res.status(400).json({
      message: "Password field is empty!",
    });
  }

  try {
    const userDoc = await User.findOne({ email: email.trim() });

    if (userDoc) {
      return res.status(400).json({
        message: "Email already in use.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = new User({
      name,
      email: email.trim(),
      password: hashedPassword,
    });

    const result = await user.save();

    console.log("User signed up successfully:", result);
    res.status(201).json({
      message: "Signup successful! Please log in.",
      userId: result._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Internal server error.",
    });
  }
};

exports.Login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required.",
    });
  }

  try {
    const user = await User.findOne({ email: email.trim() });

    if (!user) {
      return res.status(401).json({
        message: "A user with this email was not found!",
      });
    }

    const doMatch = await bcrypt.compare(password, user.password);

    if (!doMatch) {
      return res.status(401).json({
        message: "Invalid password.",
      });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(200).json({
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Internal server error.",
    });
  }
};
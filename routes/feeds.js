const express = require("express");

const { body } = require("express-validator");
const { isAuthenticated } = require("../middleware/auth");

const feedController = require("../controllers/feeds");

const router = express.Router();

// define routes
router.get("/posts", isAuthenticated, feedController.getPosts);

router.post(
  "/posts",
  [
    body("title").trim().isLength({ min: 5 }),
    body("content").trim().isLength({ min: 5 }),
  ],
  isAuthenticated,
  feedController.addPost
);

router.put(
  "/post/:postId",
  [
    body("title").trim().isLength({ min: 5 }),
    body("content").trim().isLength({ min: 5 }),
  ],
  isAuthenticated,
  feedController.editPost
);

router.get("/post/:postId", isAuthenticated, feedController.getSinglePost);

router.delete("/post/:postId", isAuthenticated, feedController.deletePost);


module.exports = router;

const express = require("express");
const { body } = require("express-validator");

const feedController = require("../controllers/feeds");

const router = express.Router();

// define routes
router.get("/posts", feedController.getPosts);

router.post(
  "/posts",
  [
    body("title").trim().isLength({ min: 5 }),
    body("content").trim().isLength({ min: 5 }),
  ],
  feedController.addPost
);

router.get("/post/:postId", feedController.getSinglePost);

router.put(
  "/post/:postId",
  [
    body("title").trim().isLength({ min: 5 }),
    body("content").trim().isLength({ min: 5 }),
  ],
  feedController.editPost
);

module.exports = router;

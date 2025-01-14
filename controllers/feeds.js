const { validationResult } = require("express-validator");
const Post = require("../models/posts");
const fs = require("fs");
const path = require("path");

// @ts-ignore
exports.getPosts = (req, res, next) => {
  Post.find()
    .then((posts) => {
      res.status(200).json({
        message: "Posts fetched successfully!",
        posts,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.addPost = (req, res, next) => {
  const { title, content } = req.body;
  const imageUrl = req.file.path.replace("\\", "/");
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error("Validation failed!! Entered data is incorrect");
    // @ts-ignore
    error.statusCode = 422;
    throw error;
  }

  const post = new Post({
    title,
    content,
    imageUrl,
    creator: {
      name: "Mosco",
    },
  });

  post
    .save()
    .then((result) => {
      console.log(result);
      res.status(201).json({
        message: "Post created successfully!",
        post: result,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.getSinglePost = (req, res, next) => {
  const postId = req.params.postId;
  console.log(postId);

  Post.findById(postId)
    .then((post) => {
      if (!post) {
        const error = new Error("Post not found!");
        // @ts-ignore
        error.statusCode = 404;
        throw error;
      }

      res.status(200).json({
        message: "Post fetched successfully!",
        post,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

const clearImage = (filePath) => {
  const resolvedPath = path.resolve(__dirname, "..", filePath);
  if (fs.existsSync(resolvedPath)) {
    fs.unlink(resolvedPath, (err) => {
      if (err) {
        console.error(`Failed to delete file at ${resolvedPath}:`, err);
      } else {
        console.log(`Successfully deleted file at ${resolvedPath}`);
      }
    });
  } else {
    console.warn(`File not found at ${resolvedPath}, nothing to delete.`);
  }
};

exports.editPost = (req, res, next) => {
  const postId = req.params.postId;
  const { title, content } = req.body;
  let imageUrl = req.body.imageUrl;

  if (req.file) {
    imageUrl = req.file.path.replace("\\", "/");
  }

  // Validation check
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed! Entered data is incorrect.");
    // @ts-ignore
    error.statusCode = 422;
    throw error;
  }

  Post.findById(postId)
    .then((post) => {
      if (!post) {
        const error = new Error("Post not found!");
        // @ts-ignore
        error.statusCode = 404;
        throw error;
      }

      if (imageUrl !== post.imageUrl) {
        console.log("Attempting to delete image at:", post.imageUrl);
        clearImage(post.imageUrl);
      }

      // Update the post's fields
      post.title = title;
      post.content = content;
      if (imageUrl) {
        post.imageUrl = imageUrl;
      }

      return post.save();
    })
    .then((updatedPost) => {
      res.status(200).json({
        message: "Post updated successfully!",
        post: updatedPost,
      });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

const { validationResult } = require("express-validator");
const Post = require("../models/posts");
const fs = require("fs");
const path = require("path");
const User = require("../models/users");
const io = require("../socket");

exports.getPosts = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const perPage = parseInt(req.query.perPage) || 2;

  try {
    const totalItems = await Post.countDocuments();
    const posts = await Post.find()
      .populate("creator")
      .sort({createdAt: -1})
      .skip((page - 1) * perPage)
      .limit(perPage);

    res.status(200).json({
      message: "Posts fetched successfully!",
      posts,
      totalItems,
      currentPage: page,
      totalPages: Math.ceil(totalItems / perPage),
      perPage,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.addPost = async (req, res, next) => {
  const { title, content } = req.body;
  const imageUrl = req.file.path.replace("\\", "/");
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const error = new Error("Validation failed! Entered data is incorrect.");
    // @ts-ignore
    error.statusCode = 422;
    throw error;
  }

  try {
    const post = new Post({
      title,
      content,
      imageUrl,
      creator: req.userId,
    });
    const savedPost = await post.save();

    // Find the user and add the post to their `posts` array
    const user = await User.findById(req.userId);
    if (!user) {
      const error = new Error("User not found!");
      // @ts-ignore
      error.statusCode = 404;
      throw error;
    }

    user.posts.push(savedPost._id); // Add the post ID to the user's `posts` array
    await user.save(); // Save the updated user document

    // Emit event to all connected clients
    io.getIO().emit("posts", {
      action: "create",
      // @ts-ignore
      post: { ...savedPost._doc, creator: { name: user.name } },
    });

    res.status(201).json({
      message: "Post created successfully!",
      post: savedPost,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getSinglePost = async (req, res, next) => {
  const postId = req.params.postId;

  try {
    const post = await Post.findById(postId);

    if (!post) {
      const error = new Error("Post not found!");
      // @ts-ignore
      error.statusCode = 404;
      throw error;
    }

    if (post.creator.toString() !== req.userId.toString()) {
      return res.status(403).json({
        message: "Unauthorized user!",
      });
    }

    res.status(200).json({
      message: "Post fetched successfully!",
      post,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
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

exports.editPost = async (req, res, next) => {
  const postId = req.params.postId;
  const { title, content } = req.body;
  let imageUrl = req.body.imageUrl;

  if (req.file) {
    imageUrl = req.file.path.replace("\\", "/");
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed! Entered data is incorrect.");
    // @ts-ignore
    error.statusCode = 422;
    throw error;
  }

  try {
    const post = await Post.findById(postId).populate("creator");

    if (!post) {
      const error = new Error("Post not found!");
      // @ts-ignore
      error.statusCode = 404;
      throw error;
    }

    if (post.creator._id.toString() !== req.userId.toString()) {
      return res.status(403).json({
        message: "Unauthorized user!",
      });
    }

    if (imageUrl !== post.imageUrl) {
      clearImage(post.imageUrl);
    }

    post.title = title;
    post.content = content;
    if (imageUrl) {
      post.imageUrl = imageUrl;
    }

    const updatedPost = await post.save();

    // Emit event to all connected clients
    io.getIO().emit("posts", {
      action: "update",
      post: {
        // @ts-ignore
        ...updatedPost._doc,
        // @ts-ignore
        creator: { _id: post.creator._id, name: post.creator.name }
      },
    });

    res.status(200).json({
      message: "Post updated successfully!",
      post: updatedPost,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId;

  try {
    const post = await Post.findById(postId).populate("creator");

    if (!post) {
      const error = new Error("Post not found!");
      // @ts-ignore
      error.statusCode = 404;
      throw error;
    }

    if (post.creator._id.toString() !== req.userId.toString()) {
      return res.status(403).json({
        message: "Unauthorized user!",
      });
    }

    // Delete the associated image file
    clearImage(post.imageUrl);

    // Remove the post from the creator's list of posts
    const user = await User.findById(post.creator._id);
    if (user) {
      // @ts-ignore
      user.posts.pull(postId);
      await user.save();
    }

    // Delete the post
    await Post.findByIdAndDelete(postId);

    // Emit event to all connected clients
    io.getIO().emit("posts", {
      action: "delete",
      postId, // Send only the ID of the deleted post
    });

    res.status(200).json({
      message: "Post deleted successfully!",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};
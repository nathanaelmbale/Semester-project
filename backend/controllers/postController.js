
const { storage }= require('../firebase')
const { getDownloadURL, ref, uploadBytesResumable } = require('firebase/storage');

const Post = require('../models/postsModel')
const Community = require('../models/communityModel')
const User = require('../models/userModel')
const mongoose = require('mongoose')

const { initializeApp } = require("firebase/app");
const { Storage } = require('@google-cloud/storage');

const firebaseConfig = {
    apiKey: "AIzaSyAxtzoJ7wztlSzpcYBC35BR3sy__aaXtOw",
    authDomain: "strathmore-connects.firebaseapp.com",
    projectId: "strathmore-connects",
    storageBucket: "strathmore-connects.appspot.com",
    messagingSenderId: "240269365746",
    appId: "1:240269365746:web:497479fbff02d740689b6b",
    measurementId: "G-6PWWSPLT67"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// get all the posts
const getPosts = async (req, res) => {
    //find all posts and sort from the most recent
    const posts = await Post.find({}).sort({ createdAt: -1 })

    //send posts as a response
    res.status(200).json(posts)
}




//create a new Item
const createPost = async (req, res) => {
    //defines parameters for the data to be inputed in the database
    const { title, description, category, community, email } = req.body

    //log the request body for debugging
    console.log("createPost request body:", req.body)

    //this is the image path
    const imagePath = req.file && req.file.filename

    //adds doc to db
    try {
        //array
        let inputFields = []

        //validate user input
        if (!title) inputFields.push('title')
        if (!description) inputFields.push('description')
        if (!category) inputFields.push('category')
        if (!community) inputFields.push('community')
        if (!email) inputFields.push('email')

        if (inputFields.length > 0) {
            return res.status(400).json(`Missing fields ${inputFields}`)
        }


        const user = await User.findOne({ email: email })

        if (!user) throw Error('Invalid email')

        const user_id = user._id

        if (!imagePath) {
            //the schema takes in title category community , imagepath(optional) , user_id
            const post = await Post.create({ title, description, category, community, email, user_id })

            //find the community by its name and get the accounts in that community
            const communite = await Community.findById({ _id: community })
            const accounts = communite.accounts


            res.status(200).json({ post, accounts })
        } else {
            const filename = Date.now()
            // Upload the image to Firebase Storage and get the download URL
            const file = req.file;
            const storage = new Storage();
            const bucket = storage.bucket();
            const firebaseFilePath = `images/${filename + file.filename}`;
            const fileUpload = bucket.file(firebaseFilePath);
            await fileUpload.save(file.buffer, { contentType: file.mimetype });
            const downloadUrl = await fileUpload.getSignedUrl({ action: "read", expires: "03-17-2025" });

            const post = await Post.create({
                title,
                description,
                category,
                email,
                community,
                imagePath,
                user_id,
                imageUrl: downloadUrl[0], // Add the Firebase Storage URL to the Post document
            });
            //confirm post has been made
            console.log("Post made today:" + post)

            //find the community by its name and get the accounts in that community
            const communite = await Community.findById({ _id: community })

            console.log("users dd", communite.accounts)
            const accounts = communite.accounts

            //sends accounts and posts back
            res.status(200).json({ post, accounts })
        }

    } catch (error) {
        console.log("failed to upload: " + error.message)
        res.status(400).json({ error: error.message })
    }

}

//add a comment
const comment = async (req, res) => {
    //defines parameters from the request body
    const { _id, comment, user } = req.body

    //log the request body for debugging
    console.log("comment request body:", req.body)

    //try make a comment
    try {
        //find post using the post id
        const post = await Post.findById({ _id: _id })
        if (!post) {
            throw Error('Post not found')
        }
        // create new Comment object
        const newComment = {
            comment: comment,
            user: user
        }

        //push comment in the array of comments
        post.comments.push(newComment)
        await post.save()

        //sends comments as a response
        res.status(200).json(post.comments)

    } catch (error) {
        res.status(400).json({ msg: error.message })
    }
}

//delete comment
const deleteComment = async (req, res) => {
    // extract postId and commentId from request body
    const { postId, commentId } = req.body

    //log the request body for debugging
    console.log("deleteComment request body:", req.body)

    try {
        // find post by postId using Post model
        const post = await Post.findById(postId)

        // if post is not found, throw an error
        if (!post) {
            throw Error('Invalid post')
        }

        // find comment index by commentId in post comments array
        const commentIndex = post.comments.findIndex(comment => comment._id == commentId)

        // if comment is not found, throw an error
        if (commentIndex === -1) {
            throw Error('Invalid comment')
        }

        // remove comment from post comments array
        post.comments.splice(commentIndex, 1)

        // save updated post
        await post.save()

        // send  response indicating comment was deleted successfully along with updated comments array
        res.status(200).json({ message: 'Comment deleted successfully', comment: post.comments })
    } catch (error) {
        // send response indicating error occurred
        res.status(400).json({ message: error.message })
    }
}

//delete a Item
const deletePost = async (req, res) => {
    // extract _id from request body
    const { _id } = req.body

    //log the request body for debugging
    console.log("deletePost request body:", req.body)

    // check if id is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(_id)) {
        // if not valid, send error message
        res.status(404).json({ error: " No such post" })
    }

    // find post by _id and sort from most recently postsed
    const post = await Post.findById({ _id: _id }).sort({ createdAt: -1 })

    // if post is not found, send error message
    if (!post) {
        return res.status(404).json({ error: "post not found" })
    }

    // remove post from database
    await post.remove()

    // send JSON response indicating post was deleted successfully
    res.status(200).json({ message: "post was deleted", posts: post })
}




module.exports = {
    createPost,
    test,
    getPosts,
    getMyPosts,
    comment,
    deleteComment,
    deletePost
}
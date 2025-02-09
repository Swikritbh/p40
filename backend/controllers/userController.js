const { ObjectId } = require("mongodb");
const User = require("../models/usersModel");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt"); // Make sure bcrypt is imported

// Route for Login
exports.login = async (req, res) => {
	const { email, password } = req.body;

	try {
		// Check if the user exists
		const user = await User.findOne({ email });
		if (!user) {
			return res.status(400).json({ message: "Invalid email or password" });
		}

		// Compare the provided password with the stored hashed password
		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			return res.status(400).json({ message: "Invalid email or password" });
		}

		// If credentials are valid
		res.status(200).json({
			message: "Login successful",
			user: {
				id: user._id,
				email: user.email,
				name: `${user.firstName} ${user.lastName}`, // Adjust based on your model
			},
		});
	} catch (error) {
		console.error("Error during login:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

// Route for Signup
exports.signup = async (req, res) => {
	const { firstName, lastName, age, phone, email, password } = req.body;

	try {
		// Check for required fields
		if (!email || !password || !firstName || !lastName) {
			return res.status(400).json({ message: "Missing required fields" });
		}

		// Check if the user already exists
		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return res.status(400).json({ message: "Email is already registered" });
		}

		// Hash the password before storing
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		// Create and save the new user
		const newUser = new User({
			firstName,
			lastName,
			age,
			phone,
			email,
			password: hashedPassword,
		});

		await newUser.save();

		// Send a success response
		res.status(201).json({
			message: "User registered successfully",
			user: {
				id: newUser._id,
				email: newUser.email,
				name: `${newUser.firstName} ${newUser.lastName}`,
			},
		});
	} catch (error) {
		console.error("Error during signup:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

// Route for getting all users
exports.getAllUsers = async (req, res) => {
	try {
		const role = req.query.role;
		let query = {};

		if (role) {
			query.role = role; // Filter by role (e.g., marshal)
		}

		const users = await User.find(query, { password: 0 }); // Exclude password
		res.status(200).json(users);
	} catch (error) {
		console.error("Error fetching users:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

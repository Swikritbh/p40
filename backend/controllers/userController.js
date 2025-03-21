const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const bcrypt = require("bcryptjs");
const User = require("../models/usersModel");
const Walk = require("../models/walkmodel");

// ✅ Helper function to generate JWT token
const generateUserToken = (user) => {
	return jwt.sign(
		{
			id: user._id,
			email: user.email,
			role: user.role,
			username: user.firstName,
			dogsWalked: user.dogsWalked,
			completedWalks: user.completedWalks,
			picture: user.picture,
		},
		process.env.JWT_SECRET,
		{ expiresIn: "1h" }
	);
};

exports.refreshToken = async (req, res) => {
	try {
		const token = req.headers["authorization"].split(" ")[1];
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		// Find the user from the database
		const user = await User.findById(decoded.id);
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		// ✅ Use the new token generator
		const newToken = generateUserToken(user);

		return res.status(200).json({ token: newToken, picture: user.picture });
	} catch (error) {
		console.error("Error refreshing token:", error);
		return res.status(401).json({ message: "Token expired or invalid" });
	}
};
// Login with email and password
exports.login = async (req, res) => {
	const { email, password } = req.body;

	try {
		const user = await User.findOne({ email });
		if (!user) {
			return res.status(400).json({ message: "Invalid email or password" });
		}

		const isMatch = bcrypt.compareSync(password, user.password);
		if (!isMatch) {
			return res.status(400).json({ message: "Invalid email or password" });
		}

		const token = generateUserToken(user);
		user.lastLogin = new Date();
		await user.save();
		res.status(200).json({
			message: "Login successful",
			token,
			user: {
				id: user._id,
				email: user.email,
				name: `${user.firstName} ${user.lastName}`,
			},
		});
	} catch (error) {
		console.error("Error during login:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

exports.googlelogin = async (req, res) => {
	const { token } = req.body;
	const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

	try {
		const ticket = await client.verifyIdToken({
			idToken: token,
			audience: process.env.GOOGLE_CLIENT_ID,
		});

		const payload = ticket.getPayload();
		const {
			given_name: firstName,
			family_name: lastName,
			email,
			picture,
			email_verified,
		} = payload;

		if (!email_verified) {
			return res.status(400).json({ message: "Email not verified" });
		}

		let user = await User.findOne({ email });

		if (!user) {
			// Respond with a 302 status and user data for frontend to complete signup
			return res.status(302).json({
				message: "User not found. Please complete the signup process.",
				user: {
					firstName,
					lastName: lastName || "",
					email,
					picture,
				},
			});
		}

		// 🔄 Update picture only if there is no existing picture
		if (!user.picture) {
			user.picture = picture;
			await user.save();
		}

		user.lastLogin = new Date();
		await user.save();

		// Generate a token for an existing user
		const jwtToken = generateUserToken(user);
		res.status(200).json({ token: jwtToken, user });
	} catch (error) {
		console.error("Google Authentication failed:", error);
		res.status(400).json({ message: "Google Authentication failed" });
	}
};

exports.googleSignup = async (req, res) => {
	const { firstName, lastName, email, age, phone, picture } = req.body;

	try {
		let user = await User.findOne({ email });

		if (user) {
			return res.status(400).json({ message: "User already exists" });
		}

		user = new User({
			firstName,
			lastName,
			email,
			age,
			phone,
			picture,
			googleAuth: true,
			role: "user",
		});

		await user.save();
		const jwtToken = generateUserToken(user);
		res.status(201).json({ token: jwtToken, user });
	} catch (error) {
		console.error("Signup failed:", error);
		res.status(500).json({ message: "Signup failed" });
	}
};
// Signup
exports.signup = async (req, res) => {
	const { firstName, lastName, email, password, age, phone } = req.body;

	try {
		if (!email || !password || !firstName || !lastName) {
			return res.status(400).json({ message: "Missing required fields" });
		}

		const existingUser = await User.findOne({ email });
		if (existingUser) {
			return res.status(400).json({ message: "Email is already registered" });
		}

		const hashedPassword = bcrypt.hashSync(password, 10);
		const newUser = new User({
			firstName,
			lastName,
			email,
			age,
			phone,
			password: hashedPassword,
		});

		await newUser.save();
		res.status(201).json({ message: "User registered successfully" });
	} catch (error) {
		console.error("Error during signup:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

// Fetch my profile
exports.myProfile = async (req, res) => {
	try {
		console.log("Fetching profile for user:", req.user.id);
		const user = await User.findById(req.user.id)
			.select("-password")
			.populate({
				path: "completedWalks",
				populate: [
					{ path: "dogId", model: "Dog" },
					{ path: "marshalId", model: "User" },
					{ path: "walkId", model: "ScheduledWalk" },
				],
			})
			.populate({
				path: "dogsWalked",
				populate: [{ path: "marshal", model: "User" }],
			});

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		res.status(200).json({ user });
	} catch (error) {
		console.error("Error fetching profile:", error);
		res.status(500).json({ message: "Failed to fetch profile" });
	}
};

// Logout (handled on client-side)
exports.logout = (req, res) => {
	res.status(200).json({
		message: "Logout successful. Please remove the token on the client side.",
	});
};

// Fetch all users (optional filtering by role)
exports.getAllUsers = async (req, res) => {
	try {
		const query = req.query.role ? { role: req.query.role } : {};
		const users = await User.find(query, { password: 0 });
		res.status(200).json(users);
	} catch (error) {
		console.error("Error fetching users:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

exports.editUser = async (req, res) => {
	try {
		const userId = req.params.id;
		const updateData = req.body;

		// Prevent updating sensitive fields like password directly
		const allowedFields = [
			"firstName",
			"lastName",
			"email",
			"role",
			"age",
			"phone",
		];
		const updates = {};

		for (const field of allowedFields) {
			if (updateData[field] !== undefined) {
				updates[field] = updateData[field];
			}
		}

		// Ensure email uniqueness if email is being updated
		if (updates.email) {
			const existingUser = await User.findOne({ email: updates.email });
			if (existingUser && existingUser._id.toString() !== userId) {
				return res.status(400).json({ message: "Email already in use" });
			}
		}

		// Update the user in the database
		const updatedUser = await User.findByIdAndUpdate(
			userId,
			{ $set: updates },
			{ new: true, runValidators: true, select: "-password" }
		);

		if (!updatedUser) {
			return res.status(404).json({ message: "User not found" });
		}

		res.status(200).json({
			message: "User updated successfully",
			user: updatedUser,
		});
	} catch (error) {
		console.error("Error updating user:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};
exports.viewUserDetail = async (req, res) => {
	try {
		const userId = req.params.id;
		console.log("Fetching user details for ID:", userId);
		// Fetch the user including all fields and populating necessary references
		const user = await User.findById(userId)
			.populate("completedWalks") // Populate completed walks if it's a reference
			.populate("dogsWalked");

		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		// Fetch the walks associated with this user
		const walks = await Walk.find({
			$or: [{ walker: userId }, { marshal: userId }],
		})
			.populate("walker")
			.populate("marshal");

		res.status(200).json({
			message: "User details fetched successfully",
			user,
			walks,
		});
	} catch (error) {
		console.error("Error fetching user details:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};

exports.deleteUser = async (req, res) => {
	try {
		const userId = req.params.id;

		// Check if the user exists
		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ message: "User not found" });
		}

		// **Check if the user is a walker or marshal before deletion**
		const walksToUpdate = await Walk.find({
			$or: [{ walker: userId }, { marshal: userId }],
			status: "Scheduled",
		});

		// **Remove the user from the `walker` array**
		await Walk.updateMany({ walker: userId }, { $pull: { walker: userId } });

		// **Remove the user from the `marshal` field**
		await Walk.updateMany({ marshal: userId }, { $unset: { marshal: "" } });

		// **Increase slots for all affected walks where status is "Scheduled"**
		for (const walk of walksToUpdate) {
			await Walk.findByIdAndUpdate(walk._id, { $inc: { slots: 1 } });
		}

		// **Delete the user after cleaning up references**
		await User.findByIdAndDelete(userId);

		res.status(200).json({
			message:
				"User removed successfully, walker/marshal removed, slots updated",
			userId,
		});
	} catch (error) {
		console.error("Error deleting user:", error);
		res.status(500).json({ message: "Internal server error" });
	}
};
exports.updateProfilePicture = async (req, res) => {
	try {
		const imageUrl = req.file.path; // Cloudinary URL

		// Update the user's picture only if it doesn't exist
		const user = await User.findById(req.user.id);

		user.picture = imageUrl;
		await user.save();

		// ✅ Directly use the refreshToken logic to issue a new token
		return this.refreshToken(req, res);
	} catch (error) {
		console.error("Error uploading picture:", error);
		res
			.status(500)
			.json({ success: false, message: "Failed to upload image." });
	}
};

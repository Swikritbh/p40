// src/components/MyProfile.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";

const MyProfile = () => {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const fetchProfile = async () => {
			try {
				const response = await axios.get(
					"http://localhost:5001/users/profile",
					{
						withCredentials: true,
					}
				);
				setUser(response.data.user);
			} catch (err) {
				setError("Please log in to view your profile.");
			} finally {
				setLoading(false);
			}
		};
		fetchProfile();
	}, []);

	const handleLogout = async () => {
		try {
			await axios.post(
				"http://localhost:5001/users/logout",
				{},
				{ withCredentials: true }
			);
			window.location.href = "/";
		} catch (err) {
			console.error("Logout failed:", err);
			alert("Failed to log out. Please try again.");
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center h-screen">
				<p className="ml-2 text-lg">Loading...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center h-screen">
				<p className="text-red-500 text-xl">{error}</p>
			</div>
		);
	}

	return (
		<div className="max-w-2xl mx-auto mt-10 p-6 bg-white shadow-lg rounded-lg">
			<h1 className="text-3xl font-bold text-gray-800 mb-6">My Profile</h1>
			<div className="space-y-4">
				<div className="flex items-center">
					<span className="w-40 font-medium text-gray-600">First Name:</span>
					<span className="text-gray-900">{user.firstName}</span>
				</div>
				<div className="flex items-center">
					<span className="w-40 font-medium text-gray-600">Last Name:</span>
					<span className="text-gray-900">{user.lastName}</span>
				</div>
				<div className="flex items-center">
					<span className="w-40 font-medium text-gray-600">Age:</span>
					<span className="text-gray-900">{user.age}</span>
				</div>
				<div className="flex items-center">
					<span className="w-40 font-medium text-gray-600">Phone:</span>
					<span className="text-gray-900">{user.phone || "N/A"}</span>
				</div>
				<div className="flex items-center">
					<span className="w-40 font-medium text-gray-600">Email:</span>
					<span className="text-gray-900">{user.email}</span>
				</div>
				<div className="flex items-center">
					<span className="w-40 font-medium text-gray-600">Role:</span>
					<span className="text-gray-900 capitalize">{user.role}</span>
				</div>
				<div className="flex items-center">
					<span className="w-40 font-medium text-gray-600">User Points:</span>
					<span className="text-gray-900">{user.userPoints}</span>
				</div>
				<div className="flex items-center">
					<span className="w-40 font-medium text-gray-600">Admin:</span>
					<span className="text-gray-900">{user.isAdmin ? "Yes" : "No"}</span>
				</div>
			</div>
			<button
				onClick={handleLogout}
				className="mt-6 w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition duration-200"
			>
				Logout
			</button>
		</div>
	);
};

export default MyProfile;

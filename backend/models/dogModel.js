const mongoose = require("mongoose");
const { Schema } = mongoose;

const dogSchema = new Schema(
	{
		name: { type: String, required: true },
		breed: { type: String, required: true },
		color: { type: String, required: true },
		age: { type: Number, required: true },
		owner: { type: String, required: false },
		adopted: { type: Boolean, default: false },
		imageURL: { type: String, required: false },
		tags: [{ type: String }], // Array of tags for filtering
		adoptedDate: { type: Date },
		size: { type: String, enum: ["Small", "Medium", "Large"], required: false },
		healthIssues: { type: String },
		status: {
			type: String,
			enum: ["Available", "Adopted", "Deceased"],
			default: "Available",
		},
		demeanor: { type: String, enum: ["Gray", "Yellow", "Red"], default: "Red" },
		notes: [{ type: String }],
		lastWalk: { type: Date },
	},
	{ timestamps: true }
);

const Dog = mongoose.model("Dog", dogSchema);

module.exports = Dog;

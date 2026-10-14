const mongoose = require('mongoose');

const citizenSchema = new mongoose.Schema({
    // 1. The Mock Data Fields (Exactly as they appear in your mockData.js)
    public_name: { type: String, required: true },
    license_type: { type: String },
    expirationDate: { type: String },
    restrictions: { type: String },
    conditions: { type: String },
    bloodType: { type: String },
    address: { type: String },
    ltoSignature: { type: String }, // The Admin's digital signature

    // 2. The System State (How we control the flow)
    status: {
        type: String,
        enum: ['Pending', 'Active', 'Revoked'],
        default: 'Pending' // Starts as pending automatically!
    },

    // 3. The Cryptographic Keys (Waiting for the Frontend)
    merkle_index: {
        type: Number,
        default: null
    },
    leaf: {
        type: String,
        default: null
    }
}, { timestamps: true });

module.exports = mongoose.model('Citizen', citizenSchema);
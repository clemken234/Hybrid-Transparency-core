// lto-backend/utils/db.js
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        // Replace MONGO_URI with whatever variable name is in your .env file
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`[DATABASE] MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`[DATABASE ERROR]: ${error.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
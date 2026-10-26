const jwt = require("jsonwebtoken");
const User = require("../models/User");


// ==================================================
// Authentication Middleware
// ==================================================

const authMiddleware = async (
    req,
    res,
    next
) => {

    try {

        const authHeader = req.headers.authorization;
        let token;

        if (
            authHeader &&
            authHeader.startsWith("Bearer ")
        ) {
            token = authHeader.split(" ")[1];
        } else if (req.query && req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message:
                    "Authentication required. Please login.",
            });
        }


        // ------------------------------------------
        // Verify Token
        // ------------------------------------------

        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );


        // ------------------------------------------
        // Find User
        // ------------------------------------------

        const user =
            await User.findById(
                decoded.id
            );


        if (!user) {

            return res.status(401).json({
                success: false,
                message: "User no longer exists.",
            });

        }


        // ------------------------------------------
        // Attach User to Request
        // ------------------------------------------

        req.user = user;

        req.userId =
            user._id.toString();


        next();

    } catch (error) {

        console.error(
            "Authentication error:",
            error.message
        );


        if (
            error.name === "JsonWebTokenError"
        ) {

            return res.status(401).json({
                success: false,
                message: "Invalid authentication token.",
            });

        }


        if (
            error.name === "TokenExpiredError"
        ) {

            return res.status(401).json({
                success: false,
                message:
                    "Authentication token has expired. Please login again.",
            });

        }


        return res.status(500).json({
            success: false,
            message:
                "Authentication failed.",
        });

    }
};


module.exports = authMiddleware;
// ==================================================
// Role-Based Access Control Middleware
// ==================================================

const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }

        const userRole = req.user.role || "user";

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Role '${userRole}' is not authorized to access this resource. Allowed roles: ${allowedRoles.join(", ")}`,
            });
        }

        next();
    };
};

module.exports = {
    authorizeRoles,
};


module.exports = (req, res, next) => {
    const methodsRequiringJson = ["POST", "PUT", "PATCH"];

    // Only validate methods that commonly send a request body.
    if (!methodsRequiringJson.includes(req.method)) {
        return next();
    }

    // Allow requests with no body.
    if (!req.headers["content-length"] &&
        !req.headers["transfer-encoding"]) {
        return next();
    }

    // Require JSON for requests containing a body.
    if (!req.is("application/json")) {
        return res.status(400).json({
            success: false,
            message: "Content-Type must be application/json"
        });
    }

    next();
};

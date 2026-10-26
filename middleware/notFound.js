module.exports = (req, res) => {
    res.status(404).json({
        success: false,
        status: 404,
        message: "Route Not Found",
        method: req.method,
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
};
module.exports = (err, req, res, next) => {
  console.error('ERROR:', err.message);
  console.error('Path:', req.path);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message
  });
};
import { adminSecretKey } from "../index.js";
import { User } from "../models/User.model.js";
import { ErrorHandler } from "../utils/utils.js";
import { TryCatch } from "./errorMiddleware.js";
import jwt from "jsonwebtoken";
export const isAuth = TryCatch(async (req, res, next) => {
  const token = req.cookies["Homies-token"];
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Please login to access this resource",
    });
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded._id;
  next();
});
const homies_TOKEN = "homies-token";
export const adminOnly = (req, res, next) => {
  const token = req.cookies["homies-admin-token"];

  if (!token)
    return next(new ErrorHandler("Only Admin can access this route", 401));

  const secretKey = jwt.verify(token, process.env.JWT_SECRET);

  const isMatched = secretKey === adminSecretKey;

  if (!isMatched)
    return next(new ErrorHandler("Only Admin can access this route", 401));

  next();
};

export const socketAuthenticator = async (socket, next) => {
  try {
    const authToken = socket.request.cookies["Homies-token"];
    console.log("AuthToken received:", authToken); // Log token to debug

    if (!authToken) {
      return next(new ErrorHandler("Please login to access this route", 401));
    }

    const decodedData = jwt.verify(authToken, process.env.JWT_SECRET);

    const user = await User.findById(decodedData._id);

    if (!user) {
      return next(new ErrorHandler("Please login to access this route", 401));
    }

    socket.user = user;

    return next();
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler("Please login to access this route", 401));
  }
};

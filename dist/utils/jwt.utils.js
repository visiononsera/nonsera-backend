import { JWT_SECRET, JWT_REFRESH_SECRET, JWT_DURATION, JWT_REFRESH_DURATION, } from "../config/env";
import jwt from "jsonwebtoken";
export const generateToken = (userId, type) => {
    return jwt.sign({ userId, type }, JWT_SECRET, { expiresIn: JWT_DURATION });
};
export const generateRefreshToken = (userId, type) => {
    return jwt.sign({ userId, type }, JWT_REFRESH_SECRET, {
        expiresIn: JWT_REFRESH_DURATION,
    });
};
export const verifyToken = (token) => {
    return jwt.verify(token, JWT_SECRET);
};
//# sourceMappingURL=jwt.utils.js.map
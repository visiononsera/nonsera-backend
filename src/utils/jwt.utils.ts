import {
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_DURATION,
  JWT_REFRESH_DURATION,
} from "../config/env";

import jwt from "jsonwebtoken";

export const generateToken = (userId: string | number, type: string): string => {
  return jwt.sign({ userId, type }, JWT_SECRET, { expiresIn: JWT_DURATION as any });
};

export const generateRefreshToken = (userId: string | number, type: string): string => {
  return jwt.sign({ userId, type }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_DURATION as any,
  });
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, JWT_SECRET);
};

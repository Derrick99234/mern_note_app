// AuthService.js

import axios from "axios";
import { BASE_URL } from "./constant";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

const AuthService = {
  login: async (email, password) => {
    try {
      const response = await axiosInstance.post("/login", { email, password });
      if (response.data && response.data.error === false) {
        localStorage.removeItem("token");
        return true; // Login successful
      }
      return false; // Login failed
    } catch (error) {
      console.error("Login error:", error);
      return false; // Login failed
    }
  },
  logout: async () => {
    try {
      await axiosInstance.post("/logout");
    } catch {
      void 0;
    } finally {
      localStorage.removeItem("token");
    }
  },
  isAuthenticated: () => {
    return true;
  },
  getToken: () => {
    return null;
  },
};

export default AuthService;

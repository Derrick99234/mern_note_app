// AuthService.js

import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "https://mern-note-app-api.vercel.app", // Your API base URL
});

const AuthService = {
  login: async (email, password) => {
    try {
      const response = await axiosInstance.post("/login", { email, password });
      if (response.data && response.data.accessToken) {
        localStorage.setItem("token", response.data.accessToken);
        return true; // Login successful
      }
      return false; // Login failed
    } catch (error) {
      console.error("Login error:", error);
      return false; // Login failed
    }
  },
  logout: () => {
    localStorage.removeItem("token");
  },
  isAuthenticated: () => {
    return localStorage.getItem("token") !== null;
  },
  getToken: () => {
    return localStorage.getItem("token");
  },
};

export default AuthService;

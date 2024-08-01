import axios from "axios";
// import { useNavigate } from "react-router-dom";

const axiosInstance = axios.create({
  // baseURL: "http://localhost:8000",
  baseURL: "https://mern-note-app-api.vercel.app",
});

axiosInstance.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem("token");
    console.log("Interceptor - Token from localStorage:", token);

    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
      console.log(
        "Interceptor - Authorization Header:",
        config.headers["Authorization"]
      );
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;

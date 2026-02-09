import axios from "axios";
import { BASE_URL } from "./constant";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config;
    const url = String(originalRequest?.url || "");

    if (
      (status === 401 || status === 403) &&
      originalRequest &&
      !originalRequest.__isRetryRequest &&
      !url.includes("/refresh_token") &&
      !url.includes("/login") &&
      !url.includes("/create_acct")
    ) {
      originalRequest.__isRetryRequest = true;
      try {
        await axiosInstance.post("/refresh_token");
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;

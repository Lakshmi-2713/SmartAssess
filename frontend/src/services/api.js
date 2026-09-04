import axios from "axios";
import { getToken, clearSession } from "./session";

/**
 * Base URL comes from the environment so a deployed build can point at a real
 * API instead of a hardcoded localhost that only ever works on a dev machine.
 */
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const API = axios.create({
  baseURL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// Attach the bearer token to every outgoing request.
API.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Normalise errors so callers can rely on `err.userMessage` rather than
 * digging through response shapes, and drop the session on a 401.
 */
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;

    if (status === 401) {
      clearSession();
      // Let the router redirect rather than hard-navigating mid-render.
      window.dispatchEvent(new CustomEvent("smartassess:unauthorized"));
    }

    let userMessage = "Something went wrong. Please try again.";
    if (data?.message) {
      userMessage = data.message;
    } else if (error.code === "ECONNABORTED") {
      userMessage = "The server took too long to respond.";
    } else if (!error.response) {
      userMessage = "Cannot reach the server. Check that the API is running.";
    }

    // Surface field-level validation errors when the API sends them.
    if (data?.errors && typeof data.errors === "object") {
      const first = Object.values(data.errors)[0];
      if (first) userMessage = first;
      error.fieldErrors = data.errors;
    }

    error.userMessage = userMessage;
    error.status = status;
    return Promise.reject(error);
  }
);

export default API;

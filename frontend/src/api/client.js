import axios from "axios";

// Where the API lives. Set VITE_API_URL at build time when deploying.
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const client = axios.create({
    baseURL: `${API_URL}/api`,
    withCredentials: true,
});

export default client;
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

// Public, no login: the product brand shown on the login page / header.
const platformApi = {
  brand: () => axios.get(`${API_BASE_URL}/platform/brand`, { timeout: 15000 }),
};

export default platformApi;

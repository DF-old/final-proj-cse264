// Centralize the backend base URL so every client request uses the same API target.
const API = import.meta.env.VITE_API_URL;
export default API
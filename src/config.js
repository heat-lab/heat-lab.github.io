// Set REACT_APP_API_BASE_URL before starting or building to override the backend.
// The development default is local; the production default remains MERLS Render.
const fallback = process.env.NODE_ENV === "development"
  ? "http://localhost:5000"
  : "https://merls-backend.onrender.com";
export const APIBASEURL = (process.env.REACT_APP_API_BASE_URL || fallback).replace(/\/+$/, "");

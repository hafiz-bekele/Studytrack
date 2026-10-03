import axios from "axios";

// In production the frontend is served by the same Express server,
// so /api calls go to the same origin. In dev the Vite proxy handles it.
const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("st_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem("st_token");
      localStorage.removeItem("st_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

/**
 * Upload a file to /api/resources/upload (multipart/form-data).
 */
export function uploadFile(file, meta = {}, onProgress) {
  const form = new FormData();
  form.append("file", file);
  if (meta.title)         form.append("title",         meta.title);
  if (meta.subjectId)     form.append("subjectId",     meta.subjectId);
  if (meta.learningNotes) form.append("learningNotes", meta.learningNotes);
  if (meta.duration)      form.append("duration",      meta.duration);

  return api.post("/resources/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: onProgress
      ? (e) => onProgress(Math.round((e.loaded / e.total) * 100))
      : undefined,
  });
}

export default api;

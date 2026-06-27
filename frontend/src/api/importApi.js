import axiosInstance from "./axiosInstance";

const importApi = {
  // Download template
  downloadTemplate: () =>
    axiosInstance.get("/import/students/template", {
      responseType: "blob",
    }),

  // Validate Excel file (preview)
  validate: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return axiosInstance.post("/import/students/validate", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60000, // 60 sec for large files
    });
  },

  // Execute the actual import
  execute: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return axiosInstance.post("/import/students/execute", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000, // 2 min for large imports
    });
  },

  // Download error report
  downloadErrorReport: (errors) =>
    axiosInstance.post(
      "/import/students/error-report",
      { errors },
      { responseType: "blob" },
    ),
};

export default importApi;

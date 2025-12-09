import React, { useState } from "react";
import { APIBASEURL } from "../config";

const DESIRED_TYPE = "video/mp4"; // backend can convert if different

const VideoUpload = () => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");

  const handleFileChange = (e) => {
    setError("");
    setUploadedUrl("");
    const f = e.target.files[0];
    if (!f) return;

    if (f.type !== DESIRED_TYPE) {
      setError(
        `This file is ${f.type}. Preferred format is ${DESIRED_TYPE}. You can still upload and the server may convert it.`
      );
    }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please choose a video first.");
      return;
    }
    setError("");
    setUploading(true);
    setUploadedUrl("");

    try {
      const formData = new FormData();
      formData.append("video", file);
      formData.append(
        "participantid",
        localStorage.getItem("username") || ""
      );

      const res = await fetch(`${APIBASEURL}/video-upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Upload failed");
      }

      const data = await res.json();
      if (data.url) {
        setUploadedUrl(data.url);
      }
    } catch (err) {
      setError(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ marginTop: 24 }}>
      <h3>Upload a video file</h3>
      <input type="file" accept="video/*" onChange={handleFileChange} />
      {file && (
        <p>
          Selected: {file.name} ({file.type || "unknown type"})
        </p>
      )}
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button onClick={handleUpload} disabled={!file || uploading}>
        {uploading ? "Uploading..." : "Upload video"}
      </button>
      {uploadedUrl && (
        <p>
          Uploaded! File URL:{" "}
          <a href={uploadedUrl} target="_blank" rel="noreferrer">
            Open
          </a>
        </p>
      )}
    </div>
  );
};

export default VideoUpload;

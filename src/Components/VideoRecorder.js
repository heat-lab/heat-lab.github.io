import React, { useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "../config";

const VIDEO_MIME = "video/webm"; // typical MediaRecorder output

const VideoRecorder = () => {
const videoRef = useRef(null);
const mediaRecorderRef = useRef(null);
const [stream, setStream] = useState(null);
const [recording, setRecording] = useState(false);
const [recordedBlob, setRecordedBlob] = useState(null);
const [previewUrl, setPreviewUrl] = useState("");
const [uploading, setUploading] = useState(false);
const [error, setError] = useState("");

useEffect(() => {
const getStream = async () => {
try {
const s = await navigator.mediaDevices.getUserMedia({
video: true,
audio: true,
});
setStream(s);
if (videoRef.current) {
videoRef.current.srcObject = s;
}
} catch (err) {
setError("Could not access camera/microphone: " + err.message);
}
};
getStream();

text
return () => {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
  }
};
}, []); // eslint-disable-line react-hooks/exhaustive-deps

const startRecording = () => {
if (!stream) {
setError("No media stream available.");
return;
}
setError("");
const chunks = [];
const mr = new MediaRecorder(stream, { mimeType: VIDEO_MIME });
mediaRecorderRef.current = mr;

text
mr.ondataavailable = (e) => {
  if (e.data && e.data.size > 0) {
    chunks.push(e.data);
  }
};

mr.onstop = () => {
  const blob = new Blob(chunks, { type: VIDEO_MIME });
  setRecordedBlob(blob);
  const url = URL.createObjectURL(blob);
  setPreviewUrl(url);
};

mr.start();
setRecording(true);
};

const stopRecording = () => {
if (mediaRecorderRef.current && recording) {
mediaRecorderRef.current.stop();
setRecording(false);
}
};

const uploadRecording = async () => {
if (!recordedBlob) {
setError("No recording to upload.");
return;
}
setError("");
setUploading(true);

text
try {
  const file = new File([recordedBlob], "recording.webm", {
    type: VIDEO_MIME,
  });

  const formData = new FormData();
  formData.append("video", file);
  formData.append(
    "participant_id",
    localStorage.getItem("username") || ""
  );
  formData.append("source", "browser-recording");

  const res = await fetch(`${API_BASE_URL}/video-upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || "Upload failed");
  }

  await res.json();
  alert("Recording uploaded successfully.");
} catch (err) {
  setError("Upload failed: " + err.message);
} finally {
  setUploading(false);
}
};

return (
<div style={{ marginTop: 24 }}>
<h3>Record a video</h3>
<video
ref={videoRef}
autoPlay
playsInline
muted
style={{ width: "320px", height: "240px", border: "1px solid #ccc" }}
/>
<div style={{ marginTop: 8 }}>
{!recording && (
<button onClick={startRecording} disabled={!stream}>
Start recording
</button>
)}
{recording && (
<button onClick={stopRecording}>
Stop recording
</button>
)}
</div>
{recordedBlob && (
<div style={{ marginTop: 12 }}>
<p>Preview:</p>
<video
src={previewUrl}
controls
style={{
width: "320px",
height: "240px",
border: "1px solid #ccc",
}}
/>
<div style={{ marginTop: 8 }}>
<button onClick={uploadRecording} disabled={uploading}>
{uploading ? "Uploading..." : "Upload recording"}
</button>
</div>
</div>
)}
{error && <p style={{ color: "red" }}>{error}</p>}
</div>
);
};

export default VideoRecorder;

3) Add VideoUpload.js
Create this file:

src/Components/VideoUpload.js

Paste this:

import React, { useState } from "react";
import { API_BASE_URL } from "../config";

const DESIRED_TYPE = "video/mp4"; // backend can convert if different

const VideoUpload = () => {
const [file, setFile] = useState(null);
const [error, setError] = useState("");
const [uploading, setUploading] = useState(false);
const [uploadedUrl, setUploadedUrl] = useState("");

const handleFileChange = (e) => {
setError("");
setUploadedUrl("");
const f = e.target.files;
if (!f) return;

text
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

text
try {
  const formData = new FormData();
  formData.append("video", file);
  formData.append(
    "participant_id",
    localStorage.getItem("username") || ""
  );

  const res = await fetch(`${API_BASE_URL}/video-upload`, {
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

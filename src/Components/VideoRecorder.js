import React, { useEffect, useRef, useState } from "react";
import { APIBASEURL } from "../config";

const VIDEO_MIME = "video/webm"; // typical MediaRecorder output

const VideoRecorder = () => {
  const [devices, setDevices] = useState([]);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState([]);
  const [streams, setStreams] = useState([]);
  const [recorders, setRecorders] = useState([]);
  const [recording, setRecording] = useState(false);
  const [recordedBlobs, setRecordedBlobs] = useState([]); // one blob per camera
  const [previewUrls, setPreviewUrls] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const videoRefs = useRef([]);

  // enumerate cameras on mount
  useEffect(() => {
    const initDevices = async () => {
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter((d) => d.kind === "videoinput");
        setDevices(videoDevices);
        // default: select all cameras
        setSelectedDeviceIds(videoDevices.map((d) => d.deviceId));
      } catch (err) {
        setError("Could not list cameras: " + err.message);
      }
    };

    initDevices();
  }, []);

  // attach streams to video elements
  useEffect(() => {
    streams.forEach((stream, index) => {
      if (videoRefs.current[index]) {
        videoRefs.current[index].srcObject = stream;
      }
    });
  }, [streams]);

  const toggleDeviceSelection = (deviceId) => {
    setError("");
    setRecordedBlobs([]);
    setPreviewUrls([]);
    setSelectedDeviceIds((prev) =>
      prev.includes(deviceId)
        ? prev.filter((id) => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const startRecording = async () => {
    if (recording) return;
    if (!selectedDeviceIds.length) {
      setError("Please select at least one camera to record.");
      return;
    }
    setError("");
    setRecordedBlobs([]);
    setPreviewUrls([]);

    try {
      // Get one stream per selected camera
      const newStreams = [];
      for (const deviceId of selectedDeviceIds) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId } },
          audio: true,
        });
        newStreams.push(stream);
      }
      setStreams(newStreams);

      // Create one MediaRecorder per stream
      const newRecorders = [];
      const allChunks = newStreams.map(() => []);
      newStreams.forEach((stream, idx) => {
        const mr = new MediaRecorder(stream, { mimeType: VIDEO_MIME });

        mr.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            allChunks[idx].push(e.data);
          }
        };

        mr.onstop = () => {
          const blob = new Blob(allChunks[idx], { type: VIDEO_MIME });
          setRecordedBlobs((prev) => {
            const copy = [...prev];
            copy[idx] = blob;
            return copy;
          });
          const url = URL.createObjectURL(blob);
          setPreviewUrls((prev) => {
            const copy = [...prev];
            copy[idx] = url;
            return copy;
          });
        };

        newRecorders.push(mr);
      });

      setRecorders(newRecorders);

      // Start all recorders together
      newRecorders.forEach((mr) => mr.start());
      setRecording(true);
    } catch (err) {
      setError("Could not start recording: " + err.message);
    }
  };

  const stopRecording = () => {
    if (!recording) return;
    recorders.forEach((mr) => {
      if (mr && mr.state !== "inactive") {
        mr.stop();
      }
    });
    streams.forEach((stream) =>
      stream.getTracks().forEach((t) => t.stop())
    );
    setRecording(false);
    setStreams([]);
    setRecorders([]);
  };

  const uploadRecording = async () => {
    if (!recordedBlobs.length) {
      setError("No recordings to upload.");
      return;
    }
    setError("");
    setUploading(true);

    try {
      const formData = new FormData();

      recordedBlobs.forEach((blob, idx) => {
        if (!blob) return;
        const file = new File([blob], `recording_cam_${idx}.webm`, {
          type: VIDEO_MIME,
        });
        formData.append("videos", file);
        formData.append(`camera_index_${idx}`, String(idx));
      });

      formData.append(
        "participant_id",
        localStorage.getItem("username") || ""
      );
      formData.append("source", "browser-multi-camera");

      const res = await fetch(`${APIBASEURL}/video-upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Upload failed");
      }

      await res.json();
      alert("All recordings uploaded successfully.");
    } catch (err) {
      setError("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ marginTop: 24 }}>
      <h3>Record video (multiple cameras)</h3>

      {/* Camera selection */}
      {devices.length === 0 && (
        <p>No cameras detected. Please connect at least one camera.</p>
      )}
      {devices.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <p>Select cameras to record from:</p>
          {devices.map((d) => (
            <label key={d.deviceId} style={{ display: "block" }}>
              <input
                type="checkbox"
                checked={selectedDeviceIds.includes(d.deviceId)}
                onChange={() => toggleDeviceSelection(d.deviceId)}
              />
              {d.label || "Camera"}
            </label>
          ))}
        </div>
      )}

      {/* Live previews while recording */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {selectedDeviceIds.map((deviceId, index) => (
          <video
            key={deviceId}
            ref={(el) => (videoRefs.current[index] = el)}
            autoPlay
            playsInline
            muted
            style={{
              width: "240px",
              height: "180px",
              border: "1px solid #ccc",
              backgroundColor: "#000",
            }}
          />
        ))}
      </div>

      <div style={{ marginTop: 8 }}>
        {!recording && (
          <button onClick={startRecording} disabled={!selectedDeviceIds.length}>
            Start recording
          </button>
        )}
        {recording && (
          <button onClick={stopRecording}>
            Stop recording
          </button>
        )}
      </div>

      {/* Recorded previews */}
      {previewUrls.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p>Recorded previews (one per camera):</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {previewUrls.map(
              (url, idx) =>
                url && (
                  <div key={idx}>
                    <p>Camera {idx + 1}</p>
                    <video
                      src={url}
                      controls
                      style={{
                        width: "240px",
                        height: "180px",
                        border: "1px solid #ccc",
                      }}
                    />
                  </div>
                )
            )}
          </div>
          <div style={{ marginTop: 8 }}>
            <button onClick={uploadRecording} disabled={uploading}>
              {uploading ? "Uploading..." : "Upload all recordings"}
            </button>
          </div>
        </div>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
};

export default VideoRecorder;

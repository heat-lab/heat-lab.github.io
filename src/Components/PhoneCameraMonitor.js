import React, { useEffect, useState } from "react";
import { APIBASEURL } from "../config";

export default function PhoneCameraMonitor({ sessionId, showChinese = false }) {
  const [devices, setDevices] = useState([]);
  const [unavailable, setUnavailable] = useState(true);
  useEffect(() => {
    let disposed = false;
    let timer;
    let controller;
    setDevices([]);
    setUnavailable(true);
    const poll = async () => {
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 4000);
      try {
        const response = await fetch(`${APIBASEURL}/recording-sessions/${sessionId}/monitor`, {
          cache: "no-store", signal: controller.signal,
        });
        if (!response.ok) throw new Error("Camera status unavailable");
        const data = await response.json();
        if (!Array.isArray(data.devices)) throw new Error("Invalid camera status");
        if (!disposed) { setDevices(data.devices); setUnavailable(false); }
      } catch {
        if (!disposed) setUnavailable(true);
      } finally {
        window.clearTimeout(timeout);
        if (!disposed) timer = window.setTimeout(poll, 1000);
      }
    };
    poll();
    return () => { disposed = true; window.clearTimeout(timer); controller?.abort(); };
  }, [sessionId]);

  const disconnected = devices.some(device => device.status === "disconnected");
  return <section aria-label={showChinese ? "手机摄像头状态" : "Phone camera status"}>
    <h3>{showChinese ? "手机摄像头" : "Phone cameras"}</h3>
    <div role="status" aria-live="polite">
      {unavailable ? <p style={{ color: "#b00020", fontWeight: 700 }}>
        {showChinese ? "无法确认手机连接。请检查网络，确认连接后再继续。" : "Phone connection cannot be confirmed. Check the network before continuing."}
      </p> : disconnected ? <p role="alert" style={{ color: "#b00020", fontWeight: 700 }}>
        {showChinese ? "手机摄像头已断开或不可用。请打开手机摄像头页面并检查连接。" : "A phone camera disconnected or became unavailable. Open its camera page and check its connection."}
      </p> : null}
    </div>
    {devices.map(device => <div key={device.role} style={{ marginBottom: 16 }}>
      <strong>{device.label}: {unavailable ? (showChinese ? "未知" : "Unknown") :
        device.status === "connected" ? (showChinese ? "已连接" : "Connected") :
        device.status === "waiting" ? (showChinese ? "等待连接" : "Waiting for connection") :
        (showChinese ? "已断开或不可用" : "Disconnected or unavailable")}</strong>
      {!unavailable && device.status === "connected" && device.preview ?
        <img src={device.preview} alt={showChinese ? "手机摄像头预览" : `${device.label} preview`}
          style={{ display: "block", width: "100%", maxWidth: 320, marginTop: 8, borderRadius: 8 }} /> :
        <p>{showChinese ? "暂无预览" : "Preview unavailable"}</p>}
    </div>)}
    <p>{showChinese ? "预览约每秒更新一次。连接中断可能需要约 8 秒才会显示。" :
      "Preview refreshes about once a second. Connection loss can take about 8 seconds to appear."}</p>
  </section>;
}

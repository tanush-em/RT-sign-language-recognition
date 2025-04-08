import React, { useState, useRef, useEffect, useCallback } from "react";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";
import {
  drawConnectors,
  drawLandmarks,
} from "@mediapipe/drawing_utils";
import { HAND_CONNECTIONS } from "@mediapipe/hands";
import Webcam from "react-webcam";
import ProgressBar from "./ProgressBar/ProgressBar";
import "./Detect.css";

const Detect = ({ modelUrl }) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const requestRef = useRef();
  const visualizationCanvasRef = useRef(null);

  const [gestureRecognizer, setGestureRecognizer] = useState(null);
  const [runningMode, setRunningMode] = useState("IMAGE");
  const [webcamRunning, setWebcamRunning] = useState(false);
  const [gestureOutput, setGestureOutput] = useState("");
  const [progress, setProgress] = useState(0);
  const [detectedData, setDetectedData] = useState([]);
  const [lastResults, setLastResults] = useState(null);

  let startTime = "";

  const drawVisualization = useCallback(() => {
    if (!lastResults || !lastResults.landmarks || !visualizationCanvasRef.current) return;
    
    const canvasCtx = visualizationCanvasRef.current.getContext("2d");
    canvasCtx.save();
    canvasCtx.clearRect(
      0, 
      0, 
      visualizationCanvasRef.current.width, 
      visualizationCanvasRef.current.height
    );
    
    canvasCtx.fillStyle = "#f8f9fa";
    canvasCtx.fillRect(
      0,
      0,
      visualizationCanvasRef.current.width,
      visualizationCanvasRef.current.height
    );
    
    // Draw hand landmarks at 2x size in the visualization canvas
    for (const landmarks of lastResults.landmarks) {
      // Scale landmarks to fit the visualization canvas
      const scaledLandmarks = landmarks.map(point => ({
        x: point.x * visualizationCanvasRef.current.width,
        y: point.y * visualizationCanvasRef.current.height,
        z: point.z
      }));
      
      drawConnectors(canvasCtx, scaledLandmarks, HAND_CONNECTIONS, {
        color: "#007bff",
        lineWidth: 5,
      });
      drawLandmarks(canvasCtx, scaledLandmarks, { color: "#dc3545", lineWidth: 2 });
    }
    
    canvasCtx.restore();
  }, [lastResults]);

  const predictWebcam = useCallback(() => {
    if (!webcamRef.current || !canvasRef.current || !gestureRecognizer) return;
    
    if (runningMode === "IMAGE") {
      setRunningMode("VIDEO");
      gestureRecognizer.setOptions({ runningMode: "VIDEO" });
    }

    const nowInMs = Date.now();
    const results = gestureRecognizer.recognizeForVideo(
      webcamRef.current.video,
      nowInMs
    );

    // Store the results for visualization
    setLastResults(results);

    const canvasCtx = canvasRef.current.getContext("2d");
    canvasCtx.save();
    canvasCtx.clearRect(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    const videoWidth = webcamRef.current.video.videoWidth;
    const videoHeight = webcamRef.current.video.videoHeight;

    webcamRef.current.video.width = videoWidth;
    webcamRef.current.video.height = videoHeight;
    canvasRef.current.width = videoWidth;
    canvasRef.current.height = videoHeight;

    if (results.landmarks) {
      for (const landmarks of results.landmarks) {
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
          color: "#007bff",
          lineWidth: 5,
        });
        drawLandmarks(canvasCtx, landmarks, { color: "#dc3545", lineWidth: 2 });
      }
    }

    if (results.gestures.length > 0) {
      const gesture = results.gestures[0][0];
      setDetectedData((prevData) => [
        ...prevData,
        {
          SignDetected: gesture.categoryName,
        },
      ]);
      setGestureOutput(gesture.categoryName);
      setProgress(Math.round(parseFloat(gesture.score) * 100));
    } else {
      setGestureOutput("");
      setProgress(0);
    }

    if (webcamRunning === true) {
      requestRef.current = requestAnimationFrame(predictWebcam);
    }
    
    // Update visualization
    drawVisualization();
  }, [webcamRunning, runningMode, gestureRecognizer, drawVisualization]);

  const animate = useCallback(() => {
    requestRef.current = requestAnimationFrame(animate);
    predictWebcam();
  }, [predictWebcam]);

  const enableCam = useCallback(() => {
    if (!gestureRecognizer) {
      alert("Please wait for gestureRecognizer to load");
      return;
    }

    if (webcamRunning === true) {
      setWebcamRunning(false);
      cancelAnimationFrame(requestRef.current);

      const endTime = new Date();
      const timeElapsed = (
        (endTime.getTime() - startTime.getTime()) /
        1000
      ).toFixed(2);

      const nonEmptyData = detectedData.filter(
        (data) => data.SignDetected !== ""
      );

      const resultArray = [];
      if (nonEmptyData.length > 0) {
        let current = nonEmptyData[0];

        for (let i = 1; i < nonEmptyData.length; i++) {
          if (nonEmptyData[i].SignDetected !== current.SignDetected) {
            resultArray.push(current);
            current = nonEmptyData[i];
          }
        }
        resultArray.push(current);
      }

      const countMap = new Map();
      for (const item of resultArray) {
        const count = countMap.get(item.SignDetected) || 0;
        countMap.set(item.SignDetected, count + 1);
      }

      const sortedArray = Array.from(countMap.entries()).sort(
        (a, b) => b[1] - a[1]
      );

      const outputArray = sortedArray
        .slice(0, 5)
        .map(([sign, count]) => ({ SignDetected: sign, count }));

      console.log("Session Results:", {
        signsPerformed: outputArray,
        secondsSpent: Number(timeElapsed),
      });

      setDetectedData([]);
    } else {
      setWebcamRunning(true);
      startTime = new Date();
      requestRef.current = requestAnimationFrame(animate);
    }
  }, [webcamRunning, gestureRecognizer, animate, detectedData]);

  useEffect(() => {
    async function loadRecognizer() {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      const recognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: modelUrl,
        },
        numHands: 2,
        runningMode: runningMode,
      });
      setGestureRecognizer(recognizer);
    }
    loadRecognizer();
  }, [modelUrl, runningMode]);

  useEffect(() => {
    // Initialize visualization canvas
    if (visualizationCanvasRef.current) {
      visualizationCanvasRef.current.width = 400;
      visualizationCanvasRef.current.height = 400;
      const ctx = visualizationCanvasRef.current.getContext("2d");
      ctx.fillStyle = "#f8f9fa";
      ctx.fillRect(0, 0, 400, 400);
    }
  }, []);

  return (
    <div className="signlang-app">
      <header className="signlang-header">
        <h1>Real-Time Sign Language Recognition</h1>
      </header>
      
      <div className="signlang-content">
        <div className="signlang-webcam-container">
          <h2>Camera Feed</h2>
          <div className="webcam-wrapper">
            <Webcam
              audio={false}
              ref={webcamRef}
              className="signlang-webcam"
            />
            <canvas ref={canvasRef} className="signlang-canvas" />
          </div>
        </div>

        <div className="signlang-visualization">
          <h2>Hand Detection</h2>
          <canvas ref={visualizationCanvasRef} className="visualization-canvas" />
        </div>
      </div>

      <div className="signlang-controls">
        <button 
          onClick={enableCam}
          className={webcamRunning ? "stop-button" : "start-button"}
        >
          {webcamRunning ? "Stop" : "Start"}
        </button>
        
        <div className="signlang-results">
          <div className="gesture-output">
            {gestureOutput ? (
              <>
                <h3>Detected Sign:</h3>
                <p>{gestureOutput}</p>
              </>
            ) : (
              <p className="no-detection">No sign detected</p>
            )}
          </div>
          
          <div className="progress-container">
            {progress > 0 && (
              <>
                <h3>Confidence:</h3>
                <ProgressBar progress={progress} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Detect;
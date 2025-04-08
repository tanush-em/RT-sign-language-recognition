import React, { useState, useRef, useEffect, useCallback } from "react";
import { FilesetResolver, GestureRecognizer } from "@mediapipe/tasks-vision";
import Webcam from "react-webcam";
import ProgressBar from "./ProgressBar/ProgressBar";
import "./Detect.css";

const Detect = ({ modelUrl }) => {
  const webcamRef = useRef(null);
  const requestRef = useRef();

  const [gestureRecognizer, setGestureRecognizer] = useState(null);
  const [runningMode, setRunningMode] = useState("IMAGE");
  const [webcamRunning, setWebcamRunning] = useState(false);
  const [gestureOutput, setGestureOutput] = useState("");
  const [progress, setProgress] = useState(0);
  const [detectedData, setDetectedData] = useState([]);
  const [detectedHistory, setDetectedHistory] = useState([]);

  let startTime = "";

  const predictWebcam = useCallback(() => {
    if (!webcamRef.current || !gestureRecognizer) return;
    
    if (runningMode === "IMAGE") {
      setRunningMode("VIDEO");
      gestureRecognizer.setOptions({ runningMode: "VIDEO" });
    }

    const nowInMs = Date.now();
    const results = gestureRecognizer.recognizeForVideo(
      webcamRef.current.video,
      nowInMs
    );

    if (results.gestures.length > 0) {
      const gesture = results.gestures[0][0];
      const detectedSign = gesture.categoryName;
      
      setDetectedData((prevData) => [
        ...prevData,
        {
          SignDetected: detectedSign,
        },
      ]);
      
      setGestureOutput(detectedSign);
      setProgress(Math.round(parseFloat(gesture.score) * 100));
      
      // Update history if the sign changes
      if (detectedHistory.length === 0 || detectedHistory[detectedHistory.length - 1] !== detectedSign) {
        setDetectedHistory(prev => {
          const newHistory = [...prev, detectedSign];
          // Keep only the last 5 unique signs
          return newHistory.slice(-5);
        });
      }
    } else {
      setGestureOutput("");
      setProgress(0);
    }

    if (webcamRunning === true) {
      requestRef.current = requestAnimationFrame(predictWebcam);
    }
  }, [webcamRunning, runningMode, gestureRecognizer, detectedHistory]);

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
      setDetectedHistory([]);
    } else {
      setWebcamRunning(true);
      startTime = new Date();
      requestRef.current = requestAnimationFrame(animate);
    }
  }, [webcamRunning, gestureRecognizer, animate, detectedData]);

  useEffect(() => {
    async function loadRecognizer() {
      try {
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
        console.log("Gesture recognizer loaded successfully");
      } catch (error) {
        console.error("Error loading gesture recognizer:", error);
      }
    }
    loadRecognizer();
  }, [modelUrl, runningMode]);

  useEffect(() => {
    // Cleanup function to cancel animation frame on unmount
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  return (
    <div className="signlang-app">
      <header className="signlang-header">
        <h1>Real Time Sign Language Recognition</h1>
        <p className="app-description">An assistive tool for for the speaking impaired.</p>
      </header>
      
      <div className="signlang-webcam-container">
        <Webcam
          audio={false}
          ref={webcamRef}
          className="signlang-webcam"
          mirrored={true}
        />
        
        <div className="signlang-controls">
          <button 
            onClick={enableCam}
            className={webcamRunning ? "stop-button" : "start-button"}
            aria-label={webcamRunning ? "Stop detection" : "Start detection"}
          >
            {webcamRunning ? "Stop Detection" : "Start Detection"}
          </button>
        </div>
      </div>

      <div className="current-detection">
        {gestureOutput ? (
          <>
            <div className="current-sign-wrapper">
              <div className="current-sign">{gestureOutput}</div>
              {progress > 0 && (
                <div className="confidence-wrapper">
                  <ProgressBar progress={progress} />
                  <span className="confidence-value">{progress}%</span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="waiting-detection">
            {webcamRunning ? "Waiting for sign..." : "Press Start to begin detection"}
          </div>
        )}
      </div>
      
      {detectedHistory.length > 0 && (
        <div className="detection-history">
          <h2>Recent Signs</h2>
          <div className="history-signs">
            {detectedHistory.map((sign, index) => (
              <div key={index} className="history-sign">{sign}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Detect;
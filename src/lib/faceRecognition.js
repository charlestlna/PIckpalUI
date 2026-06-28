import * as faceapi from "face-api.js";

const MODEL_URL = "/models/face-api";
const DETECTOR_OPTIONS = new faceapi.TinyFaceDetectorOptions({
  inputSize: 224,
  scoreThreshold: 0.5,
});

let modelsPromise = null;

export const loadFaceModels = () => {
  if (!modelsPromise) {
    modelsPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
  }

  return modelsPromise;
};

export const captureFaceDescriptor = async (video) => {
  await loadFaceModels();

  const result = await faceapi
    .detectSingleFace(video, DETECTOR_OPTIONS)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!result?.descriptor) return null;

  return Array.from(result.descriptor, value => Number(value.toFixed(6)));
};

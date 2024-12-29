// Check for browser support for Web Speech API and Geolocation
if (!('webkitSpeechRecognition' in window)) {
    alert("Your browser does not support speech recognition. Please use Chrome or Edge.");
}
if (!navigator.geolocation) {
    alert("Your browser does not support geolocation. Please use an updated browser.");
}

// Set up Speech Recognition
const recognition = new webkitSpeechRecognition();
recognition.continuous = false; // Stop listening after each utterance
recognition.interimResults = true;
recognition.lang = 'en-US';
recognition.maxAlternatives = 1;

// DOM elements
const statusElement = document.getElementById("status");
const micButton = document.getElementById("micButton");
// custom
audio = document.querySelector('audio');
// RecordRTC setup for capturing audio
let recorder;
let isRecording = false;
let isProcessing = false; // Flag to prevent multiple API calls
let silenceTimeout; // Timeout for detecting silence
let isRecognitionRunning = false; // Track recognition state
let isPlaybackActive = false; // Flag to ignore response audio
let userAddress = ""; // To store the address after geolocation API call
const drBatraClinics = [
    { address: "No 1B, 2nd Floor, Metro Tower, Adjacent to Karol Bagh Metro Station, Pusa Road, Karol Bagh, New Delhi - 110005", lat: 28.646519, lon: 77.191013 },
    { address: "Building No.18, 3rd & 4th Floor, Shreeji Tower, Shankar Vihar, Vikas Marg, near Nirman Vihar Metro Station, East Delhi Preet Vihar, New Delhi - 110092", lat: 28.627283, lon: 77.278445 },
    { address: "1st Floor, B - 1 / 517 - A, Above Kotak Mahindra Bank, Janakpuri, New Delhi - 110058", lat: 28.621995, lon: 77.090525 },
    { address: "C-11, Ground Floor, Pancheel Enclave, Near Chiragh Delhi Flyover, Gen Tito Marg, Panchsheel, New Delhi - 110017", lat: 28.541623, lon: 77.229164 },
    { address: "Shop No 351, 3rd Floor, Agarwal City Mall, Opposite M2k Rani Bagh Mall, Plot No 3, Road No 44, Pitampura, New Delhi - 110034", lat: 28.701293, lon: 77.132215 },
    { address: "D 412, 3rd Floor, Palam Extension, Ramphal Chowk Rd, Opposite Reliance Trends, Sector 7, Dwarka, New Delhi - 110075", lat: 28.574369, lon: 77.070609 },
    { address: "H.No 150 Block 25, 1st Floor, Main GT Road, Shakti Nagar, New Delhi - 110007", lat: 28.684475, lon: 77.205527 },
    { address: "Building No.22, 4th Floor, Block E, Above Manoharlal Jewelers, South Extension Part 2, New Delhi - 110049", lat: 28.567126, lon: 77.210267 },
    { address: "Shop No. 9, LGF-8, Pocket 7, Sector B, Inside Vasant Square Mall, Sector B, Vasant Kunj, New Delhi - 110070", lat: 28.521723, lon: 77.158062 },
    { address: "Unit 206, 2nd Floor, Sri Krishna Premises Co-op Society Ltd., Opp Laxmi Industrial Estate, New Link Road, Andheri West, Mumbai - 400053", lat: 19.129208, lon: 72.835022 },
    { address: "2nd Floor, Sagar Garden Building, Opposite to Domino's, C Wing, LBS Marg, Mulund West, Mumbai - 400080", lat: 19.175467, lon: 72.949126 },
    { address: "Office No 3 & 4, 1st Floor, Agnelo House, Opposite Rajasthan Hotel, Swami Vivekananda Road, Khar Pali Road, Mumbai - 400052", lat: 19.068204, lon: 72.835594 },
    { address: "2nd Floor, H Kantilal Compound, Andheri Kurla Road, Sakinaka, Andheri East, Mumbai - 400072", lat: 19.110083, lon: 72.878203 },
    { address: "No 101 & 102, 1st Floor, Value Platinum, 7th Road, Sindhu Wadi Signal, Next to Sanyas Ashram, Rajawadi, Ghatkopar East, Mumbai - 400077", lat: 19.092855, lon: 72.908625 },
    { address: "M1 & M2, Mezzanine Floor, Satyam Building, Above Girnar Tea Shop, Sion Main Circle, Sion, Mumbai - 400022", lat: 19.045569, lon: 72.865614 },
    { address: "No 10, Ground Floor, Mehta House, Opposite Bhartiya Vidya Bhavan, Chowpatty, Mumbai - 400007", lat: 18.957141, lon: 72.808657 },
    { address: "S.No 15/16, Ground Floor, Building No 3, Near Domino's Pizza, Sumer Nagar, SV Road, Borivali West, Mumbai - 400092", lat: 19.234846, lon: 72.854663 }
];

// Geoapify API Key
const geoapifyKey = "80c4323e959c436eb333cdcfb0ea8aa3";

function replaceAudio(src) {
    // var newAudio = document.createElement('audio');
    // newAudio.controls = true;
    // newAudio.autoplay = false; // Set autoplay to false for Safari

    // if (src) {
    //     newAudio.src = src;
    // }

    // var parentNode = audio.parentNode;
    // parentNode.innerHTML = '';
    // parentNode.appendChild(newAudio);

    audio.src = src;

    // Attach a user interaction to play the audio
    audio.addEventListener('canplay', () => {
        setTimeout(() => {
            audio.play().catch(err => {
                console.error("Playback error:", err);
            });
        }, 500);
    });
}

// Trigger playback after user interaction
document.getElementById('playButton').addEventListener('click', () => {
    replaceAudio(URL.createObjectURL(audioBlob));
});

// Utility function: Calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371; // Earth radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Utility function: Find the nearest clinic
function findNearestClinic(lat, lon) {
    let nearestClinic = null;
    let minDistance = Infinity;

    drBatraClinics.forEach(clinic => {
        const distance = calculateDistance(lat, lon, clinic.lat, clinic.lon);
        if (distance < minDistance) {
            minDistance = distance;
            nearestClinic = clinic;
        }
    });

    return nearestClinic;
}

// Initialize variables for location tracking
let lastKnownLat = null;
let lastKnownLon = null;
let locationInitialized = false;

// Function to handle initial location setup
async function initializeLocation() {
    if (locationInitialized) return;

    return new Promise((resolve, reject) => {
        const geoOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        // Show loading state
        statusElement.textContent = "Getting location...";

        // iOS and Safari specific timeout handling
        const locationTimeout = setTimeout(() => {
            reject("Location request timed out. Please ensure location permissions are enabled.");
        }, 10000);

        // Force location prompt in Safari
        if (!navigator.geolocation) {
            clearTimeout(locationTimeout);
            reject("Your browser does not support geolocation. Please use an updated browser.");
            return;
        }

        // Try to get location immediately on page load
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                clearTimeout(locationTimeout);
                try {
                    const { latitude, longitude } = position.coords;
                    lastKnownLat = latitude;
                    lastKnownLon = longitude;

                    const geoapifyUrl = `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&apiKey=${geoapifyKey}`;
                    const response = await fetch(geoapifyUrl);
                    const data = await response.json();

                    if (data.features && data.features.length > 0) {
                        userAddress = data.features[0].properties.formatted;
                        locationInitialized = true;
                        statusElement.textContent = "Give it a try!";
                        resolve();
                    } else {
                        reject("Unable to retrieve address.");
                    }
                } catch (error) {
                    console.error("Error fetching address:", error);
                    reject(error);
                }
            },
            (error) => {
                clearTimeout(locationTimeout);
                console.error("Geolocation error:", error);
                reject("Please enable location access to continue.");
            },
            geoOptions
        );
    });
}

// Enhanced speech recognition handling
let lastRecognitionRestartTime = 0;
const MINIMUM_RESTART_INTERVAL = 1000; // Minimum time between restarts

// Add a flag to track if actual speech was detected
let speechDetected = false;

// Add a variable to track if microphone permission is granted
let microphonePermissionGranted = false;
let activeStream = null; // Store the active audio stream

// Add recognition state tracking
let recognitionAttempts = 0;
const MAX_RECOGNITION_ATTEMPTS = 3;

// Update startRecording function
function startRecording() {
    if (!isRecording && !isPlaybackActive) {
        const now = Date.now();
        if (now - lastRecognitionRestartTime < MINIMUM_RESTART_INTERVAL) {
            return;
        }
        lastRecognitionRestartTime = now;

        // Reset states
        isRecording = false;
        isRecognitionRunning = false;
        speechDetected = false;

        // If we already have microphone permission and an active stream, use it
        if (microphonePermissionGranted && activeStream) {
            initializeRecording(activeStream);
        } else {
            // Request microphone permission
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    microphonePermissionGranted = true;
                    activeStream = stream;
                    initializeRecording(stream);
                })
                .catch(error => {
                    console.error('Error accessing media devices:', error);
                    statusElement.textContent = "Error accessing the microphone. Please ensure microphone permissions are enabled.";
                    isRecording = false;
                    isRecognitionRunning = false;
                    microphonePermissionGranted = false;
                });
        }
    }
}

// Separate function to initialize recording with a stream
function initializeRecording(stream) {
    if (isRecognitionRunning) {
        try {
            recognition.abort();
        } catch (e) {
            console.log('Recognition abort error:', e);
        }
        isRecognitionRunning = false;
    }

    recorder = new RecordRTC(stream, {
        type: 'audio',
        mimeType: getMimeType(),
        recorderType: RecordRTC.StereoAudioRecorder,
        timeSlice: 1000,
        ondataavailable: () => {
            resetSilenceDetection();
        }
    });

    recorder.startRecording();
    isRecording = true;
    statusElement.textContent = "Listening...";
    updateUIState('listening');

    setTimeout(() => {
        try {
            recognition.start();
            isRecognitionRunning = true;
            startSilenceDetection();
        } catch (e) {
            console.log('Recognition start error:', e);
            resetRecording();
        }
    }, 100);
}

// Silence detection
let silenceTimer = null;
const SILENCE_THRESHOLD = 3000; // 3 seconds of silence

function startSilenceDetection() {
    resetSilenceDetection();
    silenceTimer = setTimeout(() => {
        if (isRecording) {
            stopRecording(); // This will now handle silence gracefully
        }
    }, SILENCE_THRESHOLD);
}

function resetSilenceDetection() {
    if (silenceTimer) {
        clearTimeout(silenceTimer);
    }
    if (isRecording) {
        silenceTimer = setTimeout(() => {
            if (isRecording) {
                stopRecording();
            }
        }, SILENCE_THRESHOLD);
    }
}

// Update recognition handlers
recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i][0].transcript.trim().length > 0) {
            transcript += event.results[i][0].transcript;
            speechDetected = true; // Set flag when actual speech is detected
        }
    }
    if (transcript) {
        statusElement.textContent = `You said: ${transcript}`;
        resetSilenceDetection();
    }
};

recognition.onend = () => {
    isRecognitionRunning = false;
    if (!isPlaybackActive && !isProcessing) {
        // Reset attempts on successful completion
        recognitionAttempts = 0;
        setTimeout(() => {
            if (!isRecording && !isPlaybackActive && !isProcessing) {
                startRecording();
            }
        }, 300);
    }
};

recognition.onerror = (event) => {
    console.log('Speech recognition error:', event.error);
    isRecognitionRunning = false;

    if (event.error === 'no-speech' && recognitionAttempts < MAX_RECOGNITION_ATTEMPTS) {
        recognitionAttempts++;
        restartRecognition();
    }
};

// Function to get the appropriate mime type based on the browser
function getMimeType() {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    return isSafari ? 'audio/mp4' : 'audio/webm';
}

// Add these functions to update UI states
function updateUIState(state) {
    const micVisual = document.querySelector('.mic-visual');
    const micSvg = document.querySelector('.mic-svg');
    const speakerSvg = document.querySelector('.speaker-svg');
    const processingGif = document.querySelector('.processing-gif');
    const micButton = document.getElementById('micButton');

    // Reset all states first
    micButton.classList.remove('listening', 'speaking', 'disabled');
    micSvg.style.display = 'none';
    speakerSvg.style.display = 'none';
    processingGif.style.display = 'none';

    switch (state) {
        case 'listening':
            micSvg.style.display = 'block';
            micButton.classList.add('listening');
            break;
        case 'processing':
            processingGif.style.display = 'block';
            micButton.classList.add('disabled');
            break;
        case 'speaking':
            speakerSvg.style.display = 'block';
            micButton.classList.add('speaking');
            break;
        default:
            micSvg.style.display = 'block';
    }
}

// Stop recording and handle the audio blob
function stopRecording() {
    if (recorder && isRecording) {
        if (!speechDetected) {
            resetRecording();
            return;
        }

        recorder.stopRecording(() => {
            const blob = recorder.getBlob();
            sendAudioToWebhook(blob);

            // Clean up
            recorder.destroy();
            recorder = null;
            isRecording = false;
            speechDetected = false;
            recognitionAttempts = 0;
        });
    }
}

function sendAudioToWebhook(blob) {
    if (isProcessing) return;
    isProcessing = true;

    statusElement.textContent = "Processing...";
    updateUIState('processing');

    getUserLocation()
        .then(({ userAddress, nearestClinic }) => {
            const formData = new FormData();
            formData.append('data', blob);
            formData.append('User_address', userAddress);
            formData.append('DrBatra_address', nearestClinic.address); // Include nearest clinic's address

            fetch('https://fonada.app.n8n.cloud/webhook/dbf05039-6da2-4ffe-b3dc-1cfa03d121ec', {
                method: 'POST',
                body: formData
            })
                .then(response => response.blob())
                .then(audioBlob => {
                    replaceAudio(URL.createObjectURL(audioBlob));
                    setTimeout(() => {
                        audio.play();
                    }, 500);
                })
                .catch(error => {
                    console.error('Error sending audio:', error);
                    statusElement.textContent = "Error communicating with server.";
                })
                .finally(() => {
                    isProcessing = false;
                });
        })
        .catch(error => {
            console.error('Location or clinic error:', error);
            statusElement.textContent = "Error retrieving location or clinic.";
            isProcessing = false;
        });
}

// Function to play the audio response from the webhook
function playResponseAudio(audioBlob) {
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    statusElement.textContent = "Playing Response...";
    updateUIState('speaking');
    isPlaybackActive = true;
    speechDetected = false;
    recognitionAttempts = 0;

    audio.play()
        .then(() => {
            audio.onended = () => {
                statusElement.textContent = "Ready";
                updateUIState('listening');
                isPlaybackActive = false;
                URL.revokeObjectURL(audioUrl);
                resetRecording();
            };
        })
        .catch(error => {
            console.error('Error playing audio:', error);
            statusElement.textContent = "Error playing audio.";
            isPlaybackActive = false;
            updateUIState('listening');
            URL.revokeObjectURL(audioUrl);
            resetRecording();
        });
}

// Update handleMicClick to ensure location is initialized first
async function handleMicClick() {
    if (isProcessing || isRecording) return;

    try {
        // First, ensure we have location
        if (!locationInitialized) {
            await initializeLocation();
        }

        // Then handle microphone
        if (!isRecording && !isPlaybackActive) {
            startRecording();
        }
    } catch (error) {
        console.error("Error:", error);
        statusElement.textContent = error;
    }
}

// Initialize on page load - with retry for Safari
document.addEventListener('DOMContentLoaded', async () => {
    // Force immediate location request for Safari
    if (navigator.geolocation) {
        // Show initial prompt
        statusElement.textContent = "Please allow location access...";

        try {
            await initializeLocation();
        } catch (error) {
            console.error("Initial location error:", error);
            statusElement.textContent = "Location access needed. Please click 'Allow' when prompted.";

            // Add a visible prompt for location permission
            const locationPrompt = document.createElement('button');
            locationPrompt.textContent = "Enable Location";
            locationPrompt.style.marginTop = "10px";
            locationPrompt.onclick = async () => {
                try {
                    await initializeLocation();
                    locationPrompt.remove(); // Remove button after successful location
                } catch (err) {
                    statusElement.textContent = "Location access is required. Please enable in your browser settings.";
                }
            };
            statusElement.parentNode.insertBefore(locationPrompt, statusElement.nextSibling);
        }
    } else {
        statusElement.textContent = "Geolocation is not supported by your browser.";
    }
});

// Update getUserLocation to use the initialized location
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!locationInitialized) {
            reject("Location not initialized. Please enable location access.");
            return;
        }

        const nearestClinic = findNearestClinic(lastKnownLat, lastKnownLon);
        resolve({ userAddress, nearestClinic });
    });
}

// Clean up function for when leaving the page
window.addEventListener('beforeunload', () => {
    if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
    }
    if (recorder) {
        recorder.destroy();
    }
});

// Function to safely restart recognition
function restartRecognition() {
    if (recognition) {
        try {
            recognition.abort();
        } catch (e) {
            console.log('Recognition abort error:', e);
        }

        isRecognitionRunning = false;

        setTimeout(() => {
            try {
                recognition.start();
                isRecognitionRunning = true;
            } catch (e) {
                console.log('Recognition restart error:', e);
                // If restart fails, try complete reset
                resetRecording();
            }
        }, 100);
    }
}

// Function to completely reset recording state
function resetRecording() {
    if (recorder) {
        recorder.destroy();
        recorder = null;
    }

    if (recognition) {
        try {
            recognition.abort();
        } catch (e) {
            console.log('Recognition abort error:', e);
        }
    }

    isRecording = false;
    isRecognitionRunning = false;
    speechDetected = false;
    recognitionAttempts = 0;

    // Restart with a delay
    setTimeout(() => {
        if (!isPlaybackActive && !isProcessing) {
            startRecording();
        }
    }, 500);
}

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

// Function to get user location and reverse geocode it
function getUserLocation() {
    return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                const geoapifyUrl = `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&apiKey=${geoapifyKey}`;

                fetch(geoapifyUrl)
                    .then(response => response.json())
                    .then(data => {
                        if (data.features && data.features.length > 0) {
                            const address = data.features[0].properties.formatted;
                            userAddress = address; // Store the user's address
                            console.log("User Address:", userAddress);

                            const nearestClinic = findNearestClinic(latitude, longitude);
                            console.log("Nearest Clinic:", nearestClinic);

                            resolve({ userAddress, nearestClinic });
                        } else {
                            reject("Unable to retrieve address.");
                        }
                    })
                    .catch(error => {
                        console.error("Error fetching address:", error);
                        reject(error);
                    });
            },
            (error) => {
                console.error("Geolocation error:", error);
                reject("Geolocation access denied.");
            }
        );
    });
}

// Handle the speech recognition result
recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
    }
    statusElement.textContent = `You said: ${transcript}`;

    // Clear the previous silence timeout and reset it
    clearTimeout(silenceTimeout);

    // Set a new timeout to stop recording after 2 seconds of silence
    silenceTimeout = setTimeout(() => {
        if (isRecording) {
            stopRecording(); // Stop recording after silence
        }
    }, 2000);
};

// Handle speech recognition errors
recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
};

// Handle speech recognition end
recognition.onend = () => {
    isRecognitionRunning = false; // Update flag when recognition stops
    if (!isPlaybackActive) {
        console.log("Ready to listen again.");
    }
};

// Function to get the appropriate mime type based on the browser
function getMimeType() {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    return isSafari ? 'audio/mp4' : 'audio/webm';
}

// Start recording when the user speaks
function startRecording() {
    if (!isRecording && !isPlaybackActive) {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
            recorder = new RecordRTC(stream, {
                type: 'audio',
                mimeType: getMimeType(),  // Use the mime type based on the browser
                recorderType: RecordRTC.StereoAudioRecorder
            });
            recorder.startRecording();
            isRecording = true;
            statusElement.textContent = "Listening..."; // Change status to listening
            micButton.classList.add("disabled");

            if (!isRecognitionRunning) {
                recognition.start(); // Start recognition only if not running
                isRecognitionRunning = true;
            }
        }).catch(error => {
            console.error('Error accessing media devices:', error);
            statusElement.textContent = "Error accessing the microphone.";
        });
    }
}

// Stop recording and handle the audio blob
function stopRecording() {
    if (recorder && isRecording) {
        recorder.stopRecording(() => {
            const blob = recorder.getBlob();

            // Send the blob to the webhook
            sendAudioToWebhook(blob);

            // Reset the recorder for the next recording session
            recorder.destroy();
            recorder = null;
            isRecording = false;
        });
    }
}

function sendAudioToWebhook(blob) {
    if (isProcessing) return; // Prevent multiple API calls
    isProcessing = true;

    statusElement.textContent = "Processing..."; // Set status to processing

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
                    playResponseAudio(audioBlob);
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
    statusElement.textContent = "Playing Response..."; // Change status to Playing Response
    micButton.classList.add("disabled"); // Disable mic button while playing response

    isPlaybackActive = true; // Set playback flag to ignore response audio

    audio.play().then(() => {
        audio.onended = () => {
            statusElement.textContent = "Ready"; // Update status after playing response
            micButton.classList.remove("disabled");

            isPlaybackActive = false; // Clear playback flag

            // Reinitialize listening state
            if (!isRecognitionRunning) {
                startRecording(); // Restart listening only after playback ends
            }
        };
    }).catch(error => {
        console.error('Error playing audio:', error);
        statusElement.textContent = "Error playing audio.";
        isPlaybackActive = false; // Clear playback flag on error
    });
}

// Start the process on mic click
async function handleMicClick() {
    if (!isProcessing && !isRecording) {
        try {
            // Request geolocation before starting
            statusElement.textContent = "Getting location...";
            await getUserLocation();
            startRecording(); // Start recording after getting location
        } catch (error) {
            statusElement.textContent = error; // Show geolocation error
        }
    }
}

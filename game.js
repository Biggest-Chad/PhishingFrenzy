// High score persistence using localStorage
let highScore = localStorage.getItem('highScore') ? parseInt(localStorage.getItem('highScore')) : 0;

// Load player images for animations
const playerIdle1 = new Image();
playerIdle1.src = 'assets/player_idle_1.png'; // First idle frame
const playerIdle2 = new Image();
playerIdle2.src = 'assets/player_idle_2.png'; // Second idle frame
const playerJumpUp = new Image();
playerJumpUp.src = 'assets/player_jump_up.png'; // Jumping frame
const playerCrouch = new Image();
playerCrouch.src = 'assets/player_crouch.png'; // Crouching frame
const playerWalk1 = new Image();
playerWalk1.src = 'assets/player_walk_1.png'; // Walking frame 1
const playerWalk2 = new Image();
playerWalk2.src = 'assets/player_walk_2.png'; // Walking frame 2

// Load enemy image
const enemyImage = new Image();
enemyImage.src = 'assets/email_with_wings.png';
let enemyImageLoaded = false;

enemyImage.onload = function() {
    enemyImageLoaded = true; // Flag to confirm enemy image is loaded
};

// Load background image
const backgroundImage = new Image();
backgroundImage.src = 'assets/Office_BG.png';
let backgroundImageLoaded = false;

backgroundImage.onload = function() {
    backgroundImageLoaded = true;
    // Get the floor position from the background image height (the blue line is at ~77.5% of the image height)
    originalFloorY = (backgroundImage.height * 0.775);
    // Update game dimensions to reflect the new floor position
    updateGameDimensions();
};

// Load audio
const menuMusic = new Audio('assets/sounds/menu.mp3');
menuMusic.loop = true;
const gameMusic = new Audio('assets/sounds/game.mp3');
gameMusic.loop = true;

// Audio control variables
let isMuted = false;
let volume = 0.5; // Set initial volume to 50%
let audioInitialized = false;
let gameStarted = false;

let audioContext = null;
let filter = null;
let gameMusicSource = null;

// Create an array for walking frames
const walkingFrames = [playerWalk1, playerWalk2];
let currentWalkFrame = 0; // Index for the current walking frame
const walkFrameDuration = 200; // Duration for each walking frame in milliseconds
let lastWalkFrameSwitch = Date.now(); // Timer for switching walking frames

// Initialize audio
function initAudioWithDelay() {
    if (!audioInitialized && !gameStarted) {
        menuMusic.volume = isMuted ? 0 : volume;
        menuMusic.currentTime = 0;
        menuMusic.play().then(() => {
            audioInitialized = true;
            console.log("Menu music started successfully");
        }).catch(error => {
            console.log("Menu music playback failed:", error);
            // Retry once after user interaction
            document.addEventListener('click', () => {
                if (!audioInitialized && !gameStarted) {
                    menuMusic.play().then(() => {
                        audioInitialized = true;
                    }).catch(error => {
                        console.log("Retry failed:", error);
                    });
                }
            }, { once: true });
        });
    }
}

// Initialize audio controls
function initAudioControls() {
    const volumeSlider = document.getElementById('volumeSlider');
    const muteButton = document.getElementById('muteButton');

    // Set initial volume
    menuMusic.volume = volume;
    gameMusic.volume = volume;
    volumeSlider.value = volume * 100; // Set slider to 50%

    // Volume slider event
    volumeSlider.addEventListener('input', (e) => {
        volume = e.target.value / 100;
        if (!isMuted) {
            if (game.gameState === "menu") {
                menuMusic.volume = volume;
            } else if (game.gameState === "playing") {
                gameMusic.volume = volume;
            } else if (game.gameState === "questioning") {
                gameMusic.volume = volume * 0.5;
            }
        }
    });

    // Mute button event
    muteButton.addEventListener('click', () => {
        isMuted = !isMuted;
        if (isMuted) {
            menuMusic.volume = 0;
            gameMusic.volume = 0;
            muteButton.textContent = 'Unmute';
        } else {
            if (game.gameState === "menu") {
                menuMusic.volume = volume;
            } else if (game.gameState === "playing") {
                gameMusic.volume = volume;
            } else if (game.gameState === "questioning") {
                gameMusic.volume = volume * 0.5;
            }
            muteButton.textContent = 'Mute';
        }
    });
}

// Function to handle music transitions
function handleMusic(newState) {
    if (newState === "menu") {
        gameMusic.pause();
        gameMusic.currentTime = 0;
        menuMusic.volume = isMuted ? 0 : volume;
        menuMusic.currentTime = 0;
        menuMusic.play().catch(error => {
            console.log("Menu music playback failed:", error);
        });
    } else if (newState === "playing") {
        menuMusic.pause();
        menuMusic.currentTime = 0;
        gameMusic.volume = isMuted ? 0 : volume;
        if (gameMusic.paused) {
            gameMusic.currentTime = 0;
            gameMusic.loop = true;
            gameMusic.play().then(() => {
                console.log("Game music started successfully");
            }).catch(error => {
                console.log("Game music playback failed:", error);
                // Retry once after user interaction
                document.addEventListener('click', () => {
                    if (game.gameState === "playing") {
                        gameMusic.play().catch(error => {
                            console.log("Game music retry failed:", error);
                        });
                    }
                }, { once: true });
            });
        }
    } else if (newState === "questioning") {
        gameMusic.volume = isMuted ? 0 : volume * 0.5;
    } else if (newState === "gameOver") {
        menuMusic.pause();
        menuMusic.currentTime = 0;
        gameMusic.pause();
        gameMusic.currentTime = 0;
    }
}

// Add event listener for when the game music ends (backup in case loop doesn't work)
gameMusic.addEventListener('ended', function() {
    if (game.gameState === "playing" || game.gameState === "questioning") {
        gameMusic.currentTime = 0;
        gameMusic.play().catch(error => {
            console.log("Game music loop failed:", error);
        });
    }
});

// Define initial dimensions
const MAX_WIDTH = 1920;  // 1080p max width
const MAX_HEIGHT = 1080; // 1080p max height
const BASE_WIDTH = 800;  // Base game width
const BASE_HEIGHT = 600; // Base game height
const originalCeilingY = 125;
const originalWidth = 800;
const originalHeight = 600;
let originalFloorY = 465;

// Game object to hold state and variables
const game = {
    canvas: document.getElementById("gameCanvas"),
    ctx: null,
    width: 800,
    height: 600,
    scaleFactor: 1,
    floorY: originalFloorY,
    ceilingY: originalCeilingY,
    gameState: "menu", // Initial state: menu
    score: 0,
    lives: 3,
    difficulty: 1,
    lastDifficultyIncreaseTime: Date.now(),
    baseSpeed: 4, // Base obstacle speed in pixels per frame
    player: {
        x: 100,
        y: originalFloorY - 110, // Adjusted to place player feet on the floor line
        width: 75,
        height: 110,
        velocityY: 0,
        isJumping: false,
        canDoubleJump: true,
        idleFrame: 0, // 0 for playerIdle1, 1 for playerIdle2
        lastIdleSwitch: Date.now(), // Timer for idle animation switching
        isMovingLeft: false, // Added for left movement
        isMovingRight: false, // Added for right movement
        isCrouching: false, // Added for crouch state
        crouchHeight: 70, // Height when crouching
        normalHeight: 110, // Normal standing height
        displayWidth: 75,
        displayHeight: 110
    },
    obstacles: [], // Phish enemies
    randomEnemies: [], // Additional random enemies
    nextPhishSpawnTime: Date.now(), // Next spawn time for phish
    nextRandomSpawnTime: Date.now(), // Next spawn time for random enemies
    questions: [
            // General Cybersecurity Best Practices
            {
                question: "What is a common sign of a phishing email?",
                choices: ["Personalized greeting", "Correct spelling", "Urgent language", "Long email address"],
                correct: 2
            },
            {
                question: "What should you do with a suspicious email?",
                choices: ["Click links to investigate", "Report to IT", "Reply to sender", "Mark as spam"],
                correct: 1
            },
            {
                question: "What is malware?",
                choices: ["Software that harms your computer", "A secure login method", "A type of hardware", "An internet provider"],
                correct: 0
            },
            {
                question: "How can you protect your computer from malware?",
                choices: ["Click all pop-ups", "Share passwords", "Use the same password everywhere", "Install antivirus software"],
                correct: 3
            },
            {
                question: "What is ransomware?",
                choices: ["A backup tool", "Malware that locks your files", "A speed-up tool", "An email scam"],
                correct: 1
            },
            {
                question: "What should you do if you suspect ransomware?",
                choices: ["Pay the ransom", "Ignore it", "Disconnect and contact IT", "Restart repeatedly"],
                correct: 2
            },
            {
                question: "What is social engineering?",
                choices: ["Improving social media", "Manipulating people for info", "Computer programming", "Networking with colleagues"],
                correct: 1
            },
            {
                question: "Why lock your computer when stepping away?",
                choices: ["Save battery", "Prevent unauthorized access", "Update software", "Clear history"],
                correct: 1
            },
            {
                question: "Why are software updates important?",
                choices: ["They slow your computer", "They fix security issues", "They’re optional", "They’re only for features"],
                correct: 1
            },
            {
                question: "What is a VPN?",
                choices: ["A social platform", "A virus", "A secure internet connection", "A speed booster"],
                correct: 2
            },
            // Email Phishing
            {
                question: "What’s a red flag in a phishing email?",
                choices: ["Company logo", "Spelling mistakes", "Professional signature", "Short message"],
                correct: 1
            },
            {
                question: "How can you check an email sender’s legitimacy?",
                choices: ["Subject line", "Font style", "Sender’s email address", "Time sent"],
                correct: 2
            },
            {
                question: "What to do with an urgent email asking for login details?",
                choices: ["Reply with details", "Click the link", "Delete it", "Report to IT"],
                correct: 3
            },
            {
                question: "What is spear phishing?",
                choices: ["Random email scam", "Targeted phishing attack", "Secure email protocol", "Virus attachment"],
                correct: 1
            },
            {
                question: "Why avoid clicking links in unexpected emails?",
                choices: ["They notify IT", "They might install malware", "They improve security", "They’re safe"],
                correct: 1
            },
            {
                question: "What is a phishing website?",
                choices: ["Secure login page", "Fake site to steal info", "Shopping site", "Social media"],
                correct: 1
            },
            {
                question: "How can you verify a website’s security?",
                choices: ["Check for ads", "Look for ‘https’ and padlock", "Fast loading", "Customer reviews"],
                correct: 1
            },
            {
                question: "What to do with an email from an unknown sender?",
                choices: ["Reply to ask who", "Open it", "Report to IT", "Forward to colleagues"],
                correct: 2
            },
            {
                question: "What is a whaling attack?",
                choices: ["Malware type", "Phishing targeting executives", "Secure protocol", "Social scam"],
                correct: 1
            },
            {
                question: "Why avoid email attachments from unknown sources?",
                choices: ["They’re spam", "They might have malware", "They’re large", "They take space"],
                correct: 1
            },
            // Password Hygiene and Reuse
            {
                question: "Why is reusing passwords risky?",
                choices: ["Harder to type", "One breach risks all accounts", "Slows websites", "Easier to forget"],
                correct: 1
            },
            {
                question: "What makes a password strong?",
                choices: ["Pet’s name", "Short and simple", "Mixed letters, numbers, symbols", "Repeated characters"],
                correct: 2
            },
            {
                question: "How does a password manager help?",
                choices: ["Shares passwords", "Creates unique passwords", "Emails passwords", "Encrypts them"],
                correct: 1
            },
            {
                question: "Why avoid using your birthday in passwords?",
                choices: ["Too long", "Easy to guess", "Expires quickly", "Hard to remember"],
                correct: 1
            },
            {
                question: "What if a reused password is stolen?",
                choices: ["Only one account affected", "Multiple accounts at risk", "Password gets stronger", "Account locks"],
                correct: 1
            },
            {
                question: "What’s a secure password length?",
                choices: ["4 characters", "6 characters", "At least 12 characters", "8 characters"],
                correct: 2
            },
            {
                question: "Why avoid dictionary words in passwords?",
                choices: ["Hard to remember", "Not allowed", "Easy to guess", "Too long"],
                correct: 2
            },
            {
                question: "What is a passphrase?",
                choices: ["Malware", "Security question", "Sequence of words", "Username"],
                correct: 2
            },
            {
                question: "How often should you change passwords?",
                choices: ["Never", "Every day", "After a breach", "When forgotten"],
                correct: 2
            },
            {
                question: "What’s the purpose of a security question?",
                choices: ["Easier passwords", "Verify identity", "Share info", "Speed up login"],
                correct: 1
            },
            // Credential Theft
            {
                question: "What is credential theft?",
                choices: ["Losing a badge", "Forgetting logins", "Stealing login details", "Sharing passwords"],
                correct: 2
            },
            {
                question: "How might attackers steal credentials?",
                choices: ["Security updates", "Phishing or malware", "Polite emails", "Asking IT"],
                correct: 1
            },
            {
                question: "How can you prevent credential theft?",
                choices: ["Write passwords down", "Reuse passwords", "Use strong passwords and MFA", "Share logins"],
                correct: 2
            },
            {
                question: "What is a keylogger?",
                choices: ["Keyboard lock", "Password generator", "Records what you type", "Email feature"],
                correct: 2
            },
            {
                question: "How do phishing emails steal credentials?",
                choices: ["Lock your account", "Trick you into fake sites", "Send new passwords", "Improve security"],
                correct: 1
            },
            // Multi-Factor Authentication (MFA)
            {
                question: "What is multi-factor authentication (MFA)?",
                choices: ["Multiple passwords", "Two or more identity proofs", "Two devices", "Shared codes"],
                correct: 1
            },
            {
                question: "Why does MFA improve security?",
                choices: ["Simplifies login", "Adds extra security", "Removes passwords", "Speeds access"],
                correct: 1
            },
            {
                question: "What’s an example of MFA?",
                choices: ["Username only", "Password only", "Password and texted code", "Two passwords"],
                correct: 2
            },
            {
                question: "What’s a common MFA factor you ‘have’?",
                choices: ["Favorite color", "Password", "Phone or token", "Security question"],
                correct: 2
            },
            {
                question: "How does MFA help if a password is stolen?",
                choices: ["Changes password", "Requires another step", "Locks account", "Emails IT"],
                correct: 1
            },
            // Threats Faced by Average Users
            {
                question: "What’s a clue of a fake invoice scam?",
                choices: ["Receipt for purchase", "Immediate payment demand", "Thank-you note", "Company logo"],
                correct: 1
            },
            {
                question: "How do tech support scams often start?",
                choices: ["IT email", "Software update", "Unsolicited virus call", "Company notice"],
                correct: 2
            },
            {
                question: "What to do with a ‘You’ve won a prize!’ email?",
                choices: ["Claim prize", "Delete without replying", "Send bank details", "Forward to IT"],
                correct: 1
            },
            {
                question: "What’s a sign of a CEO fraud scam?",
                choices: ["Meeting invite", "Urgent money transfer request", "Company announcement", "Normal email"],
                correct: 1
            },
            {
                question: "Why is public Wi-Fi risky for work?",
                choices: ["It’s slow", "It’s not secure", "It costs extra", "It’s unreliable"],
                correct: 1
            },
            {
                question: "What’s a sign of a scam call?",
                choices: ["Polite caller", "Asks for personal info", "Known number", "Offers work help"],
                correct: 1
            },
            {
                question: "What to do with a suspicious call?",
                choices: ["Give info", "Stay on to investigate", "Hang up and report", "Give manager’s number"],
                correct: 2
            },
            {
                question: "What is a SIM swapping attack?",
                choices: ["Improves signal", "Takes over your phone number", "Malware", "Secure login"],
                correct: 1
            },
            {
                question: "Why be cautious on social media?",
                choices: ["Slows internet", "Helps attackers trick you", "Fills storage", "Annoys friends"],
                correct: 1
            },
            {
                question: "What is a privacy setting?",
                choices: ["Password type", "Controls who sees your info", "Security update", "Account deletion"],
                correct: 1
            },
            // Additional Questions
            {
                question: "What is a firewall?",
                choices: ["Malware", "Monitors network traffic", "Password tool", "Backup system"],
                correct: 1
            },
            {
                question: "Why back up your data?",
                choices: ["Runs faster", "Recovers lost files", "Shares files", "Updates software"],
                correct: 1
            },
            {
                question: "How to store backups securely?",
                choices: ["Desktop", "External drive or cloud", "Email inbox", "Public computer"],
                correct: 1
            },
            {
                question: "What is encryption?",
                choices: ["Malware", "Scrambling data", "Speed boost", "Social feature"],
                correct: 1
            },
            {
                question: "What is a data breach?",
                choices: ["Software update", "Unauthorized info access", "New feature", "Virus"],
                correct: 1
            },
            {
                question: "What to do if you suspect a data breach?",
                choices: ["Ignore it", "Report to IT", "Share on social media", "Delete files"],
                correct: 1
            },
            {
                question: "What’s a tactic in phishing emails?",
                choices: ["Good grammar", "Sense of urgency", "Company logo", "Known address"],
                correct: 1
            },
            {
                question: "How to dispose of old devices securely?",
                choices: ["Trash them", "Wipe data and reset", "Give to friends", "Leave at desk"],
                correct: 1
            },
            {
                question: "Why review app permissions?",
                choices: ["Runs faster", "Controls data access", "Updates app", "Shares app"],
                correct: 1
            },
            {
                question: "What’s a man-in-the-middle attack?",
                choices: ["Phishing email", "Intercepts communication", "Secure method", "Software update"],
                correct: 1
            },
            {
                question: "How to protect against SIM swapping?",
                choices: ["Share phone number", "Use PIN and MFA", "Same password", "Ignore carrier calls"],
                correct: 1
            },
            {
                question: "What’s a zero-day vulnerability?",
                choices: ["Malware", "Flaw exploited before known", "Secure practice", "Backup strategy"],
                correct: 1
            },
            {
                question: "Why report security incidents quickly?",
                choices: ["Avoid work", "Minimize damage", "Get a day off", "Impress boss"],
                correct: 1
            },
            {
                question: "What’s security awareness training?",
                choices: ["Virus", "Education on threats", "Speed boost", "Social platform"],
                correct: 1
            },
            {
                question: "Why be cautious with USB drives?",
                choices: ["Expensive", "Can carry malware", "Hard to use", "Slow computer"],
                correct: 1
            },
            {
                question: "How to handle sensitive documents?",
                choices: ["Leave on desk", "Shred when done", "Share with colleagues", "Post online"],
                correct: 1
            },
            {
                question: "What’s a DDoS attack?",
                choices: ["Phishing", "Overwhelms a system", "Secure login", "Software update"],
                correct: 1
            },
            {
                question: "How to secure your home Wi-Fi?",
                choices: ["Share password", "Use strong password and WPA3", "Default settings", "Disconnect often"],
                correct: 1
            },
            {
                question: "What’s a cookie in web browsing?",
                choices: ["Malware", "Stores browsing info", "Login token", "Speed booster"],
                correct: 1
            },
            {
                question: "Why clear browser cookies?",
                choices: ["Runs faster", "Protects privacy", "Updates software", "Saves space"],
                correct: 1
            },
            {
                question: "Why use a VPN on public Wi-Fi?",
                choices: ["Faster Wi-Fi", "Encrypts data", "Blocks sites", "Saves battery"],
                correct: 1
            },
            {
                question: "What’s a security patch?",
                choices: ["Malware", "Fixes vulnerabilities", "Data backup", "Secure login"],
                correct: 1
            },
            {
                question: "Why install security patches quickly?",
                choices: ["New features", "Protects vulnerabilities", "Slows computer", "Frees space"],
                correct: 1
            },
            {
                question: "What’s a brute force attack?",
                choices: ["Phishing", "Guessing passwords", "Secure practice", "Software update"],
                correct: 1
            },
            {
                question: "How to protect against brute force attacks?",
                choices: ["Short passwords", "Strong passwords and lockout", "Share passwords", "Click links"],
                correct: 1
            },
            {
                question: "What’s a security token?",
                choices: ["Malware", "Device for MFA", "Password tool", "Social feature"],
                correct: 1
            },
            {
                question: "Why keep a security token safe?",
                choices: ["Expensive", "Accesses accounts", "Hard to replace", "Slows computer"],
                correct: 1
            },
            {
                question: "What’s a biometric factor in MFA?",
                choices: ["Password", "Fingerprint or face", "Phone", "Security question"],
                correct: 1
            },
            {
                question: "What’s a security incident response plan?",
                choices: ["Malware", "Handles breaches", "Software update", "Social policy"],
                correct: 1
            },
            {
                question: "What’s a honeypot in cybersecurity?",
                choices: ["Malware", "Decoy for attackers", "Secure login", "Data backup"],
                correct: 1
            },
            {
                question: "What’s a security audit?",
                choices: ["Malware", "Reviews security policies", "Speed boost", "Social platform"],
                correct: 1
            },
            {
                question: "What’s a penetration test?",
                choices: ["Malware", "Simulates attack", "Secure practice", "Data backup"],
                correct: 1
            },
            {
                question: "What’s a security policy?",
                choices: ["Malware", "Rules for protection", "Software update", "Social feature"],
                correct: 1
            },
            {
                question: "What’s a risk assessment?",
                choices: ["Malware", "Evaluates threats", "Speed boost", "Social strategy"],
                correct: 1
            },
            {
                question: "What’s a security awareness program?",
                choices: ["Malware", "Trains on threats", "Software update", "Social campaign"],
                correct: 1
            },
            // Scenario-Based Questions
            {
                question: "An email from your bank asks for urgent account updates. What do you do?",
                choices: ["Click and enter details", "Call bank using official number", "Ignore it", "Forward to colleagues"],
                correct: 1
            },
            {
                question: "You need to access work documents at a coffee shop. What’s safest?",
                choices: ["Use public Wi-Fi", "Use company VPN", "Wait for office", "Use hotspot"],
                correct: 1
            },
            {
                question: "A colleague gives you a USB with files. What do you do first?",
                choices: ["Plug it in", "Scan with antivirus", "Copy to desktop", "Share it"],
                correct: 1
            },
            {
                question: "You clicked a suspicious link and your computer acts odd. What now?",
                choices: ["Restart", "Disconnect and contact IT", "Keep working", "Uninstall antivirus"],
                correct: 1
            },
            {
                question: "Setting up a new work account. How to secure it?",
                choices: ["Reuse password", "Unique password and MFA", "Use email as password", "Share with team"],
                correct: 1
            },
            {
                question: "You suspect your account is compromised. What’s first?",
                choices: ["Ignore it", "Change password and contact IT", "Post online", "Delete files"],
                correct: 1
            }
        ],
        currentQuestion: null,
        notification: null
    }

// Initialize canvas context
game.ctx = game.canvas.getContext("2d");

// Update game dimensions and scaling
function updateGameDimensions() {
    const windowWidth = window.innerWidth; // Remove MAX_WIDTH limit for horizontal
    const windowHeight = Math.min(window.innerHeight, MAX_HEIGHT);

    // Calculate scale factor based only on height
    game.scaleFactor = windowHeight / originalHeight;
    
    // Set height based on max height
    game.height = windowHeight;
    // Set width to fill window width
    game.width = windowWidth;

    // Update floor and ceiling positions
    game.floorY = originalFloorY * game.scaleFactor;
    game.ceilingY = originalCeilingY * game.scaleFactor;

    // Update canvas dimensions
    game.canvas.width = game.width;
    game.canvas.height = game.height;

    // Center the canvas in the window
    game.canvas.style.position = 'absolute';
    game.canvas.style.left = '50%';
    game.canvas.style.top = '50%';
    game.canvas.style.transform = 'translate(-50%, -50%)';

    // Update player dimensions and position
    if (game.player) {
        // Keep original dimensions but scale for display
        game.player.displayWidth = game.player.width * game.scaleFactor;
        game.player.displayHeight = game.player.height * game.scaleFactor;
        // Ensure player is positioned correctly relative to floor
        if (!game.player.isJumping && !game.player.velocityY) {
            game.player.y = game.floorY - game.player.displayHeight;
        }
    }
}

// Function to scale a value based on the current scale factor
function scale(value) {
    return value * game.scaleFactor;
}

// Function to scale a position based on the current scale factor
function scalePosition(value) {
    return value * game.scaleFactor;
}

// Handle keydown for movement and crouch
document.addEventListener("keydown", (event) => {
    if (game.gameState === "playing") {
        if (event.code === "Space") {
            if (!game.player.isJumping) {
                game.player.velocityY = -12 * game.scaleFactor;
                game.player.isJumping = true;
                game.player.canDoubleJump = true;
            } else if (game.player.canDoubleJump) {
                game.player.velocityY = -6.5 * game.scaleFactor;
                game.player.canDoubleJump = false;
            }
        } else if (event.code === "KeyA") {
            game.player.isMovingLeft = true;
        } else if (event.code === "KeyD") {
            game.player.isMovingRight = true;
        } else if (event.code === "KeyS") {
            game.player.isCrouching = true;
            game.player.height = game.player.crouchHeight;
            game.player.displayHeight = game.player.crouchHeight * game.scaleFactor;
            game.player.y = game.floorY - game.player.displayHeight;
        }
    }
});

// Handle keyup for movement and crouch
document.addEventListener("keyup", (event) => {
    if (event.code === "KeyA") {
        game.player.isMovingLeft = false;
    } else if (event.code === "KeyD") {
        game.player.isMovingRight = false;
    } else if (event.code === "KeyS") {
        game.player.isCrouching = false;
        game.player.height = game.player.normalHeight;
        game.player.displayHeight = game.player.normalHeight * game.scaleFactor;
        game.player.y = game.floorY - game.player.displayHeight;
    }
});

// Handle clicks for menu and game over
game.canvas.addEventListener("click", handleClick);

function handleClick(event) {
    if (game.gameState === "menu") {
        const rect = game.canvas.getBoundingClientRect();
        const scaleX = game.width / rect.width;
        const scaleY = game.height / rect.height;
        const mouseX = (event.clientX - rect.left) * scaleX;
        const mouseY = (event.clientY - rect.top) * scaleY;
        
        const buttonWidth = scale(100);
        const buttonHeight = scale(40);
        const buttonX = game.width / 2 - buttonWidth / 2;
        const buttonY = scale(200);
        
        if (mouseX >= buttonX && mouseX <= buttonX + buttonWidth &&
            mouseY >= buttonY && mouseY <= buttonY + buttonHeight) {
            // Stop menu music and mark game as started
            menuMusic.pause();
            menuMusic.currentTime = 0;
            gameStarted = true;
            
            game.gameState = "playing";
            handleMusic("playing");
            // Reset game variables
            game.score = 0;
            game.lives = 3;
            game.difficulty = 1;
            game.obstacles = [];
            game.randomEnemies = [];
            game.player.y = game.floorY - game.player.displayHeight;
            game.player.velocityY = 0;
            game.player.isJumping = false;
            game.nextPhishSpawnTime = Date.now();
            game.nextRandomSpawnTime = Date.now();
            game.notification = null;
        }
    } else if (game.gameState === "gameOver") {
        game.gameState = "menu";
        handleMusic("menu");
    }
}

// Show educational question pop-up
function showQuestion() {
    game.gameState = "questioning";
    handleMusic("questioning");
    const qIndex = Math.floor(Math.random() * game.questions.length);
    game.currentQuestion = game.questions[qIndex];
    document.getElementById("questionText").innerText = game.currentQuestion.question;
    for (let i = 0; i < 4; i++) {
        document.getElementById(`choice${i + 1}`).innerText = game.currentQuestion.choices[i];
    }
    document.getElementById("questionOverlay").style.display = "block";
}

// Handle answer selection
function answerQuestion(choiceIndex) {
    if (game.gameState !== "questioning") return;
    const correct = choiceIndex === game.currentQuestion.correct;
    if (correct) {
        game.score += 10;
        game.difficulty *= 1.05;
        game.notification = {
            message: "Correct!",
            color: "green",
            endTime: Date.now() + 3000
        };
    } else {
        game.lives -= 1;
        game.notification = {
            message: "Incorrect! You lost a life.",
            color: "red",
            endTime: Date.now() + 3000
        };
    }
    document.getElementById("questionOverlay").style.display = "none";
    game.gameState = game.lives > 0 ? "playing" : "gameOver";
    
    // Reset game music state
    if (game.gameState === "playing") {
        gameMusic.volume = isMuted ? 0 : volume;
        const currentTime = Date.now();
        game.nextPhishSpawnTime = currentTime + (1000 + Math.random() * 2000) * 1.3 / game.difficulty;
        game.nextRandomSpawnTime = currentTime + (2000 + Math.random() * 2000) * 1.3 / game.difficulty;
    } else {
        handleMusic("gameOver");
    }
}

// Add event listeners for answer buttons
for (let i = 0; i < 4; i++) {
    document.getElementById(`choice${i + 1}`).addEventListener("click", () => answerQuestion(i));
}

// Update game state
function update() {
    if (game.gameState !== "playing") return;

    // Player physics: apply gravity and update position
    game.player.velocityY += 0.375 * game.scaleFactor;
    game.player.y += game.player.velocityY;
    
    // Floor collision
    if (game.player.y + game.player.displayHeight > game.floorY) {
        game.player.y = game.floorY - game.player.displayHeight;
        game.player.velocityY = 0;
        game.player.isJumping = false;
    } else if (game.player.y < game.ceilingY) {
        game.player.y = game.ceilingY;
        game.player.velocityY = 0;
    }

    // Horizontal movement with proper scaling
    const movementSpeed = 5 * game.scaleFactor;
    if (game.player.isMovingLeft) {
        game.player.x -= movementSpeed;
    }
    if (game.player.isMovingRight) {
        game.player.x += movementSpeed;
    }

    // Clamp x-position to boundaries with proper scaling
    if (game.player.x < 0) {
        game.player.x = 0;
    }
    if (game.player.x + game.player.width > game.width) {
        game.player.x = game.width - game.player.width;
    }

    const currentTime = Date.now();

    // Switch idle animation frame every 0.5 seconds (50% faster)
    if (!game.player.isJumping && !game.player.isMovingLeft && !game.player.isMovingRight) {
        if (currentTime - game.player.lastIdleSwitch > 500) {
            game.player.idleFrame = (game.player.idleFrame + 1) % 2; // Toggle between 0 and 1
            game.player.lastIdleSwitch = currentTime;
        }
    } else {
        // Reset idle frame switch timer when moving
        game.player.lastIdleSwitch = currentTime; // Prevent idle frame switching while moving

        // Update walking animation frame
        if (currentTime - lastWalkFrameSwitch > walkFrameDuration) {
            currentWalkFrame = (currentWalkFrame + 1) % walkingFrames.length; // Switch to the next walking frame
            lastWalkFrameSwitch = currentTime;
        }
    }

    // Determine which player image to use based on movement
    const playerImage = game.player.isJumping ? playerJumpUp :
                        game.player.isCrouching ? playerCrouch :
                        game.player.isMovingLeft || game.player.isMovingRight ? walkingFrames[currentWalkFrame] : 
                        game.player.idleFrame === 0 ? playerIdle1 : playerIdle2; // Use idle frames

    // Render the player image
    game.ctx.drawImage(
        playerImage,
        game.player.x,
        game.player.y,
        game.player.displayWidth,
        game.player.displayHeight
    );

    // Spawn phish obstacles with wavy motion
    if (currentTime > game.nextPhishSpawnTime) {
        const playerCenterY = game.player.y + game.player.height / 2;
        const obstacleHeight = 34; // Reduced by 15% from 40
        let variance = (Math.random() - 0.5) * 100; // ±50 pixels
        if (Math.random() < 0.2) variance += (Math.random() - 0.5) * 100; // 20% chance for extra variance
        const obstacleY = Math.max(game.ceilingY, Math.min(game.floorY - obstacleHeight, playerCenterY - obstacleHeight / 2 + variance));
        game.obstacles.push({
            x: game.width,
            y: obstacleY,
            width: 34, // Reduced by 15% from 40
            height: obstacleHeight,
            waveOffset: Math.random() * Math.PI * 2,
            amplitude: 0.5 + (Math.random() - 0.5) * 0.5 // 0.25 to 0.75
        });
        game.nextPhishSpawnTime = currentTime + (1000 + Math.random() * 2000) * 1.3 / game.difficulty;
    }

    // Spawn random enemies with diagonal motion
    if (currentTime > game.nextRandomSpawnTime) {
        let randomY;
        const rand = Math.random();
        if (rand < 0.3) {
            randomY = game.ceilingY + Math.random() * 100; // Top
        } else if (rand < 0.6) {
            randomY = game.floorY - 34 - Math.random() * 100; // Bottom (adjusted for new height)
        } else {
            randomY = game.ceilingY + 25 + Math.random() * (game.floorY - game.ceilingY - 34); // Middle (adjusted for new height)
        }
        game.randomEnemies.push({
            x: game.width,
            y: randomY,
            width: 34, // Reduced by 15% from 40
            height: 34, // Reduced by 15% from 40
            vx: game.baseSpeed * game.difficulty * (0.5 + Math.random()), // 50% to 150% speed
            vy: (Math.random() - 0.5) * 2 // -1 to 1 vertical speed
        });
        game.nextRandomSpawnTime = currentTime + (2000 + Math.random() * 2000) * 1.3 / game.difficulty;
    }

    // Update phish obstacles (wavy path)
    game.obstacles.forEach(obstacle => {
        obstacle.x -= game.baseSpeed * game.difficulty;
        obstacle.y += Math.sin((obstacle.x / 50) + obstacle.waveOffset) * obstacle.amplitude;
    });
    // Award points for successfully avoided phish obstacles
    game.obstacles = game.obstacles.filter(obstacle => {
        if (obstacle.x <= -obstacle.width) {
            game.score += 1; // Award 1 point for successfully avoiding the obstacle
            return false;
        }
        return true;
    });

    // Update random enemies (diagonal path)
    game.randomEnemies.forEach(enemy => {
        enemy.x -= enemy.vx;
        enemy.y += enemy.vy;
        enemy.y = Math.max(game.ceilingY, Math.min(game.floorY - enemy.height, enemy.y)); // Clamp y-position
    });
    // Award points for successfully avoided random enemies
    game.randomEnemies = game.randomEnemies.filter(enemy => {
        if (enemy.x <= -enemy.width) {
            game.score += 1; // Award 1 point for successfully avoiding the enemy
            return false;
        }
        return true;
    });

    // Increase difficulty every 20 seconds
    if (currentTime - game.lastDifficultyIncreaseTime > 20000) {
        game.difficulty *= 1.05;
        game.lastDifficultyIncreaseTime = currentTime;
    }

    // Collision detection for phish obstacles
    game.obstacles.forEach((obstacle, index) => {
        if (checkCollision(game.player, obstacle)) {
            game.obstacles.splice(index, 1);
            showQuestion();
        }
    });

    // Collision detection for random enemies
    game.randomEnemies.forEach((enemy, index) => {
        if (checkCollision(game.player, enemy)) {
            game.randomEnemies.splice(index, 1);
            showQuestion();
        }
    });

    // Check for game over
    if (game.lives <= 0) {
        game.gameState = "gameOver";
        if (game.score > highScore) {
            highScore = game.score;
            localStorage.setItem('highScore', highScore);
        }
    }

    // Increment score over time
    if (currentTime % 100 === 0) game.score += 1; // Simple score increment
}

// Collision detection function
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Update notification styling in the CSS
const notificationStyle = `
    #notification {
        position: fixed;
        top: 80px; /* Move down to align with the score counter */
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8); /* Slightly darker for better visibility */
        color: white;
        padding: 15px 30px; /* Adjust padding for a better look */
        border-radius: 10px;
        font-size: 72px; /* Increase font size to 100% bigger (from 36px to 72px) */
        font-weight: bold; /* Make the text bold */
        font-family: 'Segoe UI', Arial, sans-serif; /* Change font for better aesthetics */
        text-align: center;
        display: none;
        z-index: 1000;
    }
`;

// Add the style to the document
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = notificationStyle;
document.head.appendChild(styleSheet);

// Render game elements
function render() {
    game.ctx.clearRect(0, 0, game.width, game.height);

    // Draw background
    if (backgroundImageLoaded) {
        game.ctx.drawImage(backgroundImage, 0, 0, game.width, game.height);
    } else {
        game.ctx.fillStyle = "black";
        game.ctx.fillRect(0, 0, game.width, game.height);
    }

    if (game.gameState === "menu") {
        // Menu screen
        game.ctx.fillStyle = "black";
        game.ctx.font = `${scale(40)}px Arial`;
        game.ctx.textAlign = "center";
        game.ctx.fillText("Phishing Frenzy - By SWT", game.width / 2, scale(100));
        game.ctx.font = `${scale(20)}px Arial`;
        game.ctx.fillText(`High Score: ${highScore}`, game.width / 2, scale(150));
        game.ctx.fillStyle = "green";
        game.ctx.fillRect(
            game.width / 2 - scale(50),
            scale(200),
            scale(100),
            scale(40)
        );
        game.ctx.fillStyle = "white";
        game.ctx.fillText("Start", game.width / 2, scale(225));

        // Draw semi-transparent background for text
        game.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        game.ctx.fillRect(
            game.width / 2 - scale(300),
            scale(250),
            scale(600),
            scale(100)
        );

        // Draw the text
        game.ctx.fillStyle = "white";
        game.ctx.font = `${scale(16)}px Arial`;
        game.ctx.textAlign = "center";
        game.ctx.fillText(
            "Press Spacebar to jump - Press S to crouch.",
            game.width / 2,
            scale(280)
        );
        game.ctx.fillText(
            "Press A to move left, press D to move right.",
            game.width / 2,
            scale(300)
        );
        game.ctx.fillText(
            "Avoid the phishing emails!",
            game.width / 2,
            scale(320)
        );
    } else if (game.gameState === "playing" || game.gameState === "questioning") {
        // Determine which player image to use based on movement
        const playerImage = game.player.isJumping ? playerJumpUp :
                            game.player.isCrouching ? playerCrouch :
                            game.player.isMovingLeft || game.player.isMovingRight ? walkingFrames[currentWalkFrame] : 
                            game.player.idleFrame === 0 ? playerIdle1 : playerIdle2; // Use idle frames

        game.ctx.drawImage(
            playerImage,
            game.player.x,
            game.player.y,
            game.player.displayWidth,
            game.player.displayHeight
        );

        // Draw enemies with proper scaling
        game.obstacles.forEach(obstacle => {
            if (enemyImageLoaded) {
                game.ctx.drawImage(
                    enemyImage,
                    obstacle.x,
                    obstacle.y,
                    scale(obstacle.width),
                    scale(obstacle.height)
                );
            }
        });

        game.randomEnemies.forEach(enemy => {
            if (enemyImageLoaded) {
                game.ctx.drawImage(
                    enemyImage,
                    enemy.x,
                    enemy.y,
                    scale(enemy.width),
                    scale(enemy.height)
                );
            }
        });

        // Draw HUD (score and lives)
        game.ctx.fillStyle = "#E77A24";
        game.ctx.font = `${scale(20)}px Arial`;
        game.ctx.textAlign = "left";
        game.ctx.fillText(`Score: ${game.score}`, scale(10), scale(30));
        game.ctx.fillText(`Lives: ${game.lives}`, scale(10), scale(60));

        // Render notification at the new position
        if (game.notification && Date.now() < game.notification.endTime) {
            const notificationElement = document.getElementById("notification");
            notificationElement.style.display = "block";
            notificationElement.style.color = game.notification.color;
            notificationElement.innerText = game.notification.message;
        } else {
            document.getElementById("notification").style.display = "none"; // Hide when not needed
        }
    } else if (game.gameState === "gameOver") {
        // Game over screen
        game.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        game.ctx.fillRect(0, 0, game.width, game.height);
        game.ctx.fillStyle = "white";
        game.ctx.font = `${scale(40)}px Arial`;
        game.ctx.textAlign = "center";
        game.ctx.fillText("Game Over!", game.width / 2, game.height / 2 - scale(20));
        game.ctx.fillText(`Final Score: ${game.score}`, game.width / 2, game.height / 2 + scale(20));
        game.ctx.font = `${scale(20)}px Arial`;
        game.ctx.fillText(`High Score: ${highScore}`, game.width / 2, game.height / 2 + scale(60));
        game.ctx.fillText("Click to return to menu", game.width / 2, game.height / 2 + scale(100));
    }
}

// Time variables for fixed time step
const FPS = 60;
const FRAME_TIME = 1000 / FPS;
let lastFrameTime = 0;
let accumulator = 0;

// Game loop with fixed time step
function gameLoop(currentTime) {
    if (lastFrameTime === 0) {
        lastFrameTime = currentTime;
    }

    // Calculate time since last frame
    const deltaTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;
    
    // Add to accumulator
    accumulator += deltaTime;

    // Update game state at fixed time steps
    while (accumulator >= FRAME_TIME) {
        update();
        accumulator -= FRAME_TIME;
    }

    // Render at screen refresh rate
    render();
    
    // Request next frame
    requestAnimationFrame(gameLoop);
}

// Initial setup
updateGameDimensions();
window.addEventListener('resize', updateGameDimensions);

// Initialize audio
initAudioControls();
initAudioWithDelay();

// Start the game with proper timestamp
requestAnimationFrame(gameLoop);

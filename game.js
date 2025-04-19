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

// Initialize audio
function initAudioWithDelay() {
    if (!audioInitialized && !gameStarted) {
        menuMusic.volume = isMuted ? 0 : volume;
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
        menuMusic.currentTime = 0; // Reset menu music position
        menuMusic.play().catch(error => {
            console.log("Menu music playback failed:", error);
        });
    } else if (newState === "playing") {
        if (!gameMusic.played.length) { // Only start if not already playing
            menuMusic.pause();
            menuMusic.currentTime = 0;
            gameMusic.volume = isMuted ? 0 : volume;
            gameMusic.currentTime = 0; // Reset game music position
            gameMusic.play().catch(error => {
                console.log("Game music playback failed:", error);
            });
        } else {
            gameMusic.volume = isMuted ? 0 : volume; // Just restore volume
        }
    } else if (newState === "questioning") {
        gameMusic.volume = isMuted ? 0 : volume * 0.5; // Reduce volume by 50%
    } else if (newState === "gameOver") {
        menuMusic.pause();
        menuMusic.currentTime = 0;
        gameMusic.pause();
        gameMusic.currentTime = 0;
        // Start menu music after game over
        setTimeout(() => {
            menuMusic.volume = isMuted ? 0 : volume;
            menuMusic.play().catch(error => {
                console.log("Menu music playback failed:", error);
            });
        }, 500);
    }
}

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
        // Comprehensive list of educational questions
        {
            question: "What is a common sign of a phishing email?",
            choices: ["Personalized greeting", "Urgent language", "Correct spelling", "Long email address"],
            correct: 1
        },
        {
            question: "What should you do with a suspicious email?",
            choices: ["Click links to investigate", "Reply to sender", "Report to IT", "Ignore it"],
            correct: 2
        },
        {
            question: "Which is a safe practice to avoid phishing?",
            choices: ["Same password everywhere", "Click unknown links", "Enable 2FA", "Share passwords"],
            correct: 2
        },
        // Email Phishing
        {
            question: "What is a red flag that an email might be a phishing attempt?",
            choices: ["A generic greeting like 'Dear Customer'", "A professional signature", "A company logo", "No attachments"],
            correct: 0
        },
        {
            question: "What should you check to confirm an email sender's legitimacy?",
            choices: ["The sender's email address", "The email subject line", "The email's font style", "The time it was sent"],
            correct: 0
        },
        {
            question: "What's the best action if you get an email asking for urgent login details?",
            choices: ["Report it to your IT team", "Reply with your credentials", "Click the link to verify", "Forward it to a coworker"],
            correct: 0
        },
        {
            question: "What is spear phishing?",
            choices: ["A phishing attack targeting a specific person", "A random email scam", "A virus in an email attachment", "A secure email protocol"],
            correct: 0
        },
        {
            question: "Why is it risky to click links in unexpected emails?",
            choices: ["They could take you to fake websites", "They always download software", "They improve your security", "They notify your IT team"],
            correct: 0
        },
        // Password Reuse
        {
            question: "Why is reusing passwords across sites dangerous?",
            choices: ["A breach in one site risks all accounts", "It makes passwords harder to type", "It slows down websites", "It locks accounts faster"],
            correct: 0
        },
        {
            question: "What makes a password strong?",
            choices: ["Mixing letters, numbers, and symbols", "Using your pet's name", "Keeping it short and simple", "Repeating the same character"],
            correct: 0
        },
        {
            question: "How does a password manager improve security?",
            choices: ["It creates and saves unique passwords", "It shares passwords with others", "It emails your passwords", "It shortens login times"],
            correct: 0
        },
        {
            question: "What's a risk of using your birthday in a password?",
            choices: ["It's easy for attackers to guess", "It's too long to remember", "It expires quickly", "It confuses websites"],
            correct: 0
        },
        {
            question: "What happens if a reused password is stolen?",
            choices: ["Attackers can access multiple accounts", "Only one account is affected", "Your password gets stronger", "Your account locks automatically"],
            correct: 0
        },
        // Credential Theft
        {
            question: "What does credential theft mean?",
            choices: ["Stealing login usernames and passwords", "Losing your work badge", "Forgetting your login details", "Sharing passwords with coworkers"],
            correct: 0
        },
        {
            question: "How might attackers steal your credentials?",
            choices: ["Phishing emails, malware, or weak passwords", "Sending you a security update", "Asking politely via email", "Improving your account security"],
            correct: 0
        },
        {
            question: "What's a good way to prevent credential theft?",
            choices: ["Use strong passwords and MFA", "Write passwords on paper", "Reuse passwords across sites", "Click all email links"],
            correct: 0
        },
        {
            question: "What is a keylogger?",
            choices: ["Software that records what you type", "A tool to lock your keyboard", "A password generator", "An email security feature"],
            correct: 0
        },
        {
            question: "How can phishing emails lead to credential theft?",
            choices: ["By tricking you into entering details on fake sites", "By locking your account", "By sending you a new password", "By updating your security settings"],
            correct: 0
        },
        // Multi-Factor Authentication (MFA)
        {
            question: "What is multi-factor authentication (MFA)?",
            choices: ["Using two or more ways to prove your identity", "Having multiple passwords", "Logging in from two devices", "Sharing login codes"],
            correct: 0
        },
        {
            question: "Why does MFA make accounts safer?",
            choices: ["It adds extra security beyond a password", "It simplifies login steps", "It removes the need for passwords", "It speeds up access"],
            correct: 0
        },
        {
            question: "What's an example of MFA in action?",
            choices: ["Password and a texted code", "Username and password only", "Two different passwords", "Email and a security question"],
            correct: 0
        },
        {
            question: "What's a common MFA factor you 'have'?",
            choices: ["A phone or security token", "Your favorite color", "Your password", "Your username"],
            correct: 0
        },
        {
            question: "How does MFA help if your password is stolen?",
            choices: ["It requires another step attackers can't easily bypass", "It changes your password automatically", "It locks your account", "It emails your IT team"],
            correct: 0
        },
        // Scams
        {
            question: "What's a clue you've received a fake invoice scam?",
            choices: ["A demand for immediate payment", "A receipt for a purchase you made", "A thank-you note", "A detailed order history"],
            correct: 0
        },
        {
            question: "How do tech support scams often start?",
            choices: ["An unsolicited call about a virus", "An email from your IT team", "A software update notice", "A scheduled support visit"],
            correct: 0
        },
        {
            question: "What should you do with a 'You've won a prize!' email?",
            choices: ["Delete it without replying", "Click to claim your prize", "Send your bank details", "Share it with friends"],
            correct: 0
        },
        {
            question: "What's a sign of a CEO fraud scam?",
            choices: ["An email from your boss asking for urgent money transfers", "A meeting invite from your CEO", "A company-wide announcement", "A payroll update"],
            correct: 0
        },
        {
            question: "Why is public Wi-Fi risky for work tasks?",
            choices: ["It might not be secure from eavesdropping", "It's slower than home Wi-Fi", "It costs extra to use", "It blocks work websites"],
            correct: 0
        }
    ],
    currentQuestion: null,
    notification: null // Tracks notification message, color, and end time
};

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
    handleMusic(game.gameState);
    if (game.gameState === "playing") {
        const currentTime = Date.now();
        game.nextPhishSpawnTime = currentTime + (1000 + Math.random() * 2000) * 1.3 / game.difficulty;
        game.nextRandomSpawnTime = currentTime + (2000 + Math.random() * 2000) * 1.3 / game.difficulty;
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

    // Switch idle animation frame every second when not jumping
    if (!game.player.isJumping && currentTime - game.player.lastIdleSwitch > 1000) {
        game.player.idleFrame = (game.player.idleFrame + 1) % 2;
        game.player.lastIdleSwitch = currentTime;
    }

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
            "Press Spacebar to jump and use the W A S D keys to move around and crouch.",
            game.width / 2,
            scale(280)
        );
        game.ctx.fillText(
            "Avoid the phishing emails!",
            game.width / 2,
            scale(310)
        );
    } else if (game.gameState === "playing" || game.gameState === "questioning") {
        // Draw player with animation and proper scaling
        const playerImage = game.player.isJumping ? playerJumpUp :
                          game.player.isCrouching ? playerCrouch :
                          game.player.idleFrame === 0 ? playerIdle1 : playerIdle2;
        
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

        // Render notification
        if (game.notification && Date.now() < game.notification.endTime) {
            game.ctx.fillStyle = game.notification.color;
            game.ctx.font = `${scale(24)}px Arial`;
            game.ctx.textAlign = "center";
            game.ctx.fillText(
                game.notification.message,
                game.width / 2,
                game.height - scale(50)
            );
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

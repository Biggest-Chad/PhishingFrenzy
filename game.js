// High score persistence using localStorage
let highScore = localStorage.getItem('highScore') ? parseInt(localStorage.getItem('highScore')) : 0;

// Load player images for animations
const playerIdle1 = new Image();
playerIdle1.src = 'assets/player_idle_1.png'; // First idle frame
const playerIdle2 = new Image();
playerIdle2.src = 'assets/player_idle_2.png'; // Second idle frame
const playerJumpUp = new Image();
playerJumpUp.src = 'assets/player_jump_up.png'; // Jumping frame

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
    backgroundImageLoaded = true; // Flag to confirm background image is loaded
};

// Define floor and ceiling based on background PNG dimensions
const floorY = 475;    // Y-coordinate of the floor
const ceilingY = 125;  // Y-coordinate of the ceiling

// Game object to hold state and variables
const game = {
    canvas: document.getElementById("gameCanvas"),
    ctx: null,
    width: 800,
    height: 600,
    gameState: "menu", // Initial state: menu
    score: 0,
    lives: 3,
    difficulty: 1,
    lastDifficultyIncreaseTime: Date.now(),
    baseSpeed: 4, // Base obstacle speed in pixels per frame
    player: {
        x: 100,
        y: floorY - 105, 
        width: 75,
        height: 110,
        velocityY: 0,
        isJumping: false,
        canDoubleJump: true,
        idleFrame: 0, // 0 for playerIdle1, 1 for playerIdle2
        lastIdleSwitch: Date.now(), // Timer for idle animation switching
        isMovingLeft: false, // Added for left movement
        isMovingRight: false // Added for right movement
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
            question: "What should you check to confirm an email sender’s legitimacy?",
            choices: ["The sender’s email address", "The email subject line", "The email’s font style", "The time it was sent"],
            correct: 0
        },
        {
            question: "What’s the best action if you get an email asking for urgent login details?",
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
            choices: ["Mixing letters, numbers, and symbols", "Using your pet’s name", "Keeping it short and simple", "Repeating the same character"],
            correct: 0
        },
        {
            question: "How does a password manager improve security?",
            choices: ["It creates and saves unique passwords", "It shares passwords with others", "It emails your passwords", "It shortens login times"],
            correct: 0
        },
        {
            question: "What’s a risk of using your birthday in a password?",
            choices: ["It’s easy for attackers to guess", "It’s too long to remember", "It expires quickly", "It confuses websites"],
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
            question: "What’s a good way to prevent credential theft?",
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
            question: "What’s an example of MFA in action?",
            choices: ["Password and a texted code", "Username and password only", "Two different passwords", "Email and a security question"],
            correct: 0
        },
        {
            question: "What’s a common MFA factor you 'have'?",
            choices: ["A phone or security token", "Your favorite color", "Your password", "Your username"],
            correct: 0
        },
        {
            question: "How does MFA help if your password is stolen?",
            choices: ["It requires another step attackers can’t easily bypass", "It changes your password automatically", "It locks your account", "It emails your IT team"],
            correct: 0
        },
        // Scams
        {
            question: "What’s a clue you’ve received a fake invoice scam?",
            choices: ["A demand for immediate payment", "A receipt for a purchase you made", "A thank-you note", "A detailed order history"],
            correct: 0
        },
        {
            question: "How do tech support scams often start?",
            choices: ["An unsolicited call about a virus", "An email from your IT team", "A software update notice", "A scheduled support visit"],
            correct: 0
        },
        {
            question: "What should you do with a 'You’ve won a prize!' email?",
            choices: ["Delete it without replying", "Click to claim your prize", "Send your bank details", "Share it with friends"],
            correct: 0
        },
        {
            question: "What’s a sign of a CEO fraud scam?",
            choices: ["An email from your boss asking for urgent money transfers", "A meeting invite from your CEO", "A company-wide announcement", "A payroll update"],
            correct: 0
        },
        {
            question: "Why is public Wi-Fi risky for work tasks?",
            choices: ["It might not be secure from eavesdropping", "It’s slower than home Wi-Fi", "It costs extra to use", "It blocks work websites"],
            correct: 0
        }
    ],
    currentQuestion: null,
    notification: null // Tracks notification message, color, and end time
};

// Initialize canvas context
game.ctx = game.canvas.getContext("2d");

// Handle player jump and movement input
document.addEventListener("keydown", (event) => {
    if (game.gameState === "playing") {
        if (event.code === "Space") {
            if (!game.player.isJumping) {
                game.player.velocityY = -12; // Jump strength
                game.player.isJumping = true;
                game.player.canDoubleJump = true; // Enable double jump
            } else if (game.player.canDoubleJump) {
                game.player.velocityY = -6.5; // Double jump at 50% height
                game.player.canDoubleJump = false; // Prevent further jumps
            }
        } else if (event.code === "KeyA") {
            game.player.isMovingLeft = true;
        } else if (event.code === "KeyD") {
            game.player.isMovingRight = true;
        }
    }
});

// Handle keyup for movement
document.addEventListener("keyup", (event) => {
    if (event.code === "KeyA") {
        game.player.isMovingLeft = false;
    } else if (event.code === "KeyD") {
        game.player.isMovingRight = false;
    }
});

// Handle clicks for menu and game over
game.canvas.addEventListener("click", handleClick);

function handleClick(event) {
    if (game.gameState === "menu") {
        const rect = game.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        // Start button bounds: x: 350-450, y: 200-240
        if (mouseX >= game.width / 2 - 50 && mouseX <= game.width / 2 + 50 &&
            mouseY >= 200 && mouseY <= 240) {
            game.gameState = "playing";
            // Reset game variables for a new game
            game.score = 0;
            game.lives = 3;
            game.difficulty = 1;
            game.obstacles = [];
            game.randomEnemies = [];
            game.player.y = floorY - game.player.height;
            game.player.velocityY = 0;
            game.player.isJumping = false;
            game.nextPhishSpawnTime = Date.now();
            game.nextRandomSpawnTime = Date.now();
            game.notification = null; // Clear notification on new game
        }
    } else if (game.gameState === "gameOver") {
        game.gameState = "menu"; // Return to menu on click
    }
}

// Show educational question pop-up
function showQuestion() {
    game.gameState = "questioning";
    const qIndex = Math.floor(Math.random() * game.questions.length);
    game.currentQuestion = game.questions[qIndex];
    document.getElementById("questionText").innerText = game.currentQuestion.question;
    for (let i = 0; i < 4; i++) {
        document.getElementById(`choice${i + 1}`).innerText = game.currentQuestion.choices[i];
    }
    document.getElementById("questionOverlay").style.display = "block";
    console.log("Game state set to questioning");
}

// Handle answer selection
function answerQuestion(choiceIndex) {
    if (game.gameState !== "questioning") return;
    console.log("Processing answer, current game state:", game.gameState);
    const correct = choiceIndex === game.currentQuestion.correct;
    if (correct) {
        game.score += 10; // Bonus points for correct answer
        game.difficulty *= 1.05; // Slight difficulty increase
        // Set "Correct!" notification in green
        game.notification = {
            message: "Correct!",
            color: "green",
            endTime: Date.now() + 3000 // Display for 3 seconds
        };
    } else {
        game.lives -= 1; // Lose a life for wrong answer
        // Set "Incorrect!" notification in red
        game.notification = {
            message: "Incorrect! You lost a life.",
            color: "red",
            endTime: Date.now() + 3000 // Display for 3 seconds
        };
    }
    document.getElementById("questionOverlay").style.display = "none";
    game.gameState = game.lives > 0 ? "playing" : "gameOver";
    console.log("Setting game state to:", game.gameState);
    // Reset spawn timers to prevent immediate spawns
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
    game.player.velocityY += 0.375; // Gravity
    game.player.y += game.player.velocityY;
    if (game.player.y + game.player.height > floorY) {
        game.player.y = floorY - game.player.height; // Snap to floor
        game.player.velocityY = 0;
        game.player.isJumping = false;
    } else if (game.player.y < ceilingY) {
        game.player.y = ceilingY; // Snap to ceiling
        game.player.velocityY = 0;
    }

    // Horizontal movement
    const movementSpeed = 5;
    if (game.player.isMovingLeft) {
        game.player.x -= movementSpeed;
    }
    if (game.player.isMovingRight) {
        game.player.x += movementSpeed;
    }

    // Clamp x-position to boundaries
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
        const obstacleHeight = 40; // Reduced by 20% from 50
        let variance = (Math.random() - 0.5) * 100; // ±50 pixels
        if (Math.random() < 0.2) variance += (Math.random() - 0.5) * 100; // 20% chance for extra variance
        const obstacleY = Math.max(ceilingY, Math.min(floorY - obstacleHeight, playerCenterY - obstacleHeight / 2 + variance));
        game.obstacles.push({
            x: game.width,
            y: obstacleY,
            width: 40, // Reduced by 20% from 50
            height: obstacleHeight,
            waveOffset: Math.random() * Math.PI * 2,
            amplitude: 0.5 + (Math.random() - 0.5) * 0.5 // 0.25 to 0.75
        });
        game.nextPhishSpawnTime = currentTime + (1000 + Math.random() * 2000) * 1.3 / game.difficulty; // Increased by 30%
    }

    // Spawn random enemies with diagonal motion
    if (currentTime > game.nextRandomSpawnTime) {
        let randomY;
        const rand = Math.random();
        if (rand < 0.3) {
            randomY = ceilingY + Math.random() * 100; // Top
        } else if (rand < 0.6) {
            randomY = floorY - 40 - Math.random() * 100; // Bottom (adjusted for new height)
        } else {
            randomY = ceilingY + 25 + Math.random() * (floorY - ceilingY - 40); // Middle (adjusted for new height)
        }
        game.randomEnemies.push({
            x: game.width,
            y: randomY,
            width: 40, // Reduced by 20% from 50
            height: 40, // Reduced by 20% from 50
            vx: game.baseSpeed * game.difficulty * (0.5 + Math.random()), // 50% to 150% speed
            vy: (Math.random() - 0.5) * 2 // -1 to 1 vertical speed
        });
        game.nextRandomSpawnTime = currentTime + (2000 + Math.random() * 2000) * 1.3 / game.difficulty; // Increased by 30%
    }

    // Update phish obstacles (wavy path)
    game.obstacles.forEach(obstacle => {
        obstacle.x -= game.baseSpeed * game.difficulty;
        obstacle.y += Math.sin((obstacle.x / 50) + obstacle.waveOffset) * obstacle.amplitude;
    });
    game.obstacles = game.obstacles.filter(obstacle => obstacle.x > -obstacle.width);

    // Update random enemies (diagonal path)
    game.randomEnemies.forEach(enemy => {
        enemy.x -= enemy.vx;
        enemy.y += enemy.vy;
        enemy.y = Math.max(ceilingY, Math.min(floorY - enemy.height, enemy.y)); // Clamp y-position
    });
    game.randomEnemies = game.randomEnemies.filter(enemy => enemy.x > -enemy.width);

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
        game.ctx.fillStyle = "lightblue"; // Sky fallback
        game.ctx.fillRect(0, 0, game.width, game.height);
    }

    if (game.gameState === "menu") {
        // Menu screen
        game.ctx.fillStyle = "black";
        game.ctx.font = "40px Arial";
        game.ctx.textAlign = "center";
        game.ctx.fillText("Phishing Frenzy - By SWT", game.width / 2, 100);
        game.ctx.font = "20px Arial";
        game.ctx.fillText(`High Score: ${highScore}`, game.width / 2, 150);
        game.ctx.fillStyle = "green";
        game.ctx.fillRect(game.width / 2 - 50, 200, 100, 40);
        game.ctx.fillStyle = "white";
        game.ctx.fillText("Start", game.width / 2, 225);

        // Draw semi-transparent background for text
        game.ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; // Semi-transparent black
        game.ctx.fillRect(game.width / 2 - 250, 250, 500, 100); // Centered, 500x100 box

        // Draw the text
        game.ctx.fillStyle = "white";
        game.ctx.font = "16px Arial"; // Slightly smaller than start button's 20px for fit
        game.ctx.textAlign = "center";
        game.ctx.fillText("Joe needs your help to avoid Phishing Emails at work!", game.width / 2, 280);
        game.ctx.fillText("Jump to dodge the emails, and answer safety questions when needed.", game.width / 2, 310);
    } else if (game.gameState === "playing" || game.gameState === "questioning") {
        // Draw player with animation
        if (game.player.isJumping) {
            game.ctx.drawImage(playerJumpUp, game.player.x, game.player.y, game.player.width, game.player.height);
        } else {
            const idleImage = game.player.idleFrame === 0 ? playerIdle1 : playerIdle2;
            game.ctx.drawImage(idleImage, game.player.x, game.player.y, game.player.width, game.player.height);
        }

        // Draw phish obstacles and random enemies
        game.obstacles.forEach(obstacle => {
            if (enemyImageLoaded) {
                game.ctx.drawImage(enemyImage, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            } else {
                game.ctx.fillStyle = "red"; // Fallback
                game.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            }
        });
        game.randomEnemies.forEach(enemy => {
            if (enemyImageLoaded) {
                game.ctx.drawImage(enemyImage, enemy.x, enemy.y, enemy.width, enemy.height);
            } else {
                game.ctx.fillStyle = "purple"; // Fallback
                game.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
            }
        });

        // Draw HUD (score and lives)
        game.ctx.fillStyle = "#E77A24"; // Changed to hexcode #E77A24
        game.ctx.font = "20px Arial";
        game.ctx.textAlign = "left";
        game.ctx.fillText(`Score: ${game.score}`, 10, 30);
        game.ctx.fillText(`Lives: ${game.lives}`, 10, 60);

        // Render the notification if it exists and hasn’t expired
        if (game.notification && Date.now() < game.notification.endTime) {
            game.ctx.fillStyle = game.notification.color; // Set color (green or red)
            game.ctx.font = "24px Arial"; // Set font size and style
            game.ctx.textAlign = "center"; // Center the text
            game.ctx.fillText(
                game.notification.message,
                game.width / 2, // Center horizontally
                game.height - 50 // Near the bottom of the canvas
            );
        }
    } else if (game.gameState === "gameOver") {
        // Game over screen
        game.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        game.ctx.fillRect(0, 0, game.width, game.height);
        game.ctx.fillStyle = "white";
        game.ctx.font = "40px Arial";
        game.ctx.textAlign = "center";
        game.ctx.fillText("Game Over!", game.width / 2, game.height / 2 - 20);
        game.ctx.fillText(`Final Score: ${game.score}`, game.width / 2, game.height / 2 + 20);
        game.ctx.font = "20px Arial";
        game.ctx.fillText(`High Score: ${highScore}`, game.width / 2, game.height / 2 + 60);
        game.ctx.fillText("Click to return to menu", game.width / 2, game.height / 2 + 100);
    }
}

// Game loop
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Start the game
gameLoop();
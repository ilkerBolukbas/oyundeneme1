export class GameScene extends Phaser.Scene {
    private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
    private platforms!: Phaser.Physics.Arcade.StaticGroup;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private background!: Phaser.GameObjects.TileSprite;
    private worldWidth: number = 100000; // Much larger world for endless gameplay
    private enemies!: Phaser.Physics.Arcade.Group;
    private bullets!: Phaser.Physics.Arcade.Group;
    private healthPickups!: Phaser.Physics.Arcade.Group;
    private nextEnemySpawn: number = 0;
    private nextHealthSpawn: number = 0;
    private enemySpawnInterval: number = 5000;
    private healthSpawnInterval: number = 15000; // Health spawns every 15 seconds
    private lives: number = 3;
    private maxLives: number = 5; // Maximum number of lives
    private livesText!: Phaser.GameObjects.Text;
    private isInvulnerable: boolean = false;
    private isGameOver: boolean = false;
    private lastPlatformX: number = 0; // Track last platform position
    private score: number = 0;
    private scoreText!: Phaser.GameObjects.Text;
    private baseSpeed: number = 250; // Base movement speed
    private currentSpeed: number = 250; // Current movement speed
    private speedMultiplier: number = 1; // Speed multiplier that increases with score
    private enemyTypes: string[] = ['ugur', 'hursit', 'muko', 'kader', 'kader', 'kader', 'zehra'];
    private spaceKey!: Phaser.Input.Keyboard.Key;
    private lastShotTime: number = 0;
    private shootCooldown: number = 250; // Reduced from 500 to 250ms for faster shooting
    private backgroundMusic!: Phaser.Sound.BaseSound;

    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // Load background and platform images
        this.load.image('background', 'assets/img/duvar.jpg');
        this.load.image('platform', 'assets/img/sur.png');
        // Load enemy sprites
        this.load.image('ugur', 'assets/img/ugur.png');
        this.load.image('hursit', 'assets/img/hursit.png');
        this.load.image('muko', 'assets/img/muko.png');
        this.load.image('kader', 'assets/img/kader.png');
        this.load.image('zehra', 'assets/img/zehra.png');
        
        // Load health pickup image (a heart)
        this.load.image('health', 'assets/img/kalp.png');
        
        // Load stone projectile image
        this.load.image('tas', 'assets/img/tas.png');

        // Load background music
        this.load.audio('background-music', 'assets/oyunmuzik.mp3');
    }

    create() {
        // Initialize and play background music
        this.backgroundMusic = this.sound.add('background-music', {
            volume: 0.5,
            loop: true
        });
        this.backgroundMusic.play();

        // Reset all game states at the start
        this.isGameOver = false;
        this.lives = 3;
        this.nextEnemySpawn = 0;
        this.nextHealthSpawn = 0;
        this.isInvulnerable = false;
        this.score = 0;
        this.lastPlatformX = 0;
        this.lastShotTime = 0;

        // Initialize input keys
        if (this.input && this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        }

        // Get the selected character
        const selectedCharacter = this.registry.get('selectedCharacter') || { name: 'Sila', sprite: 'sila' };

        // Configure physics world
        this.physics.world.setBounds(0, 0, this.worldWidth, 1000);
        this.physics.world.gravity.y = 500;

        // Add scrolling background
        this.background = this.add.tileSprite(0, 0, this.worldWidth, 600, 'background')
            .setOrigin(0, 0)
            .setScrollFactor(0, 0)
            .setDisplaySize(this.worldWidth, 600)
            .setDepth(0);

        // Create platforms group with physics
        this.platforms = this.physics.add.staticGroup();

        // Initial platform generation
        this.generateInitialPlatforms();

        // Create player with the selected character sprite
        this.player = this.physics.add.sprite(100, 350, selectedCharacter.sprite)
            .setDisplaySize(150 * 0.7, 150)
            .setDepth(2);

        // Player physics properties
        this.player.setBounce(0);
        this.player.setCollideWorldBounds(false);
        this.player.setGravityY(500);

        // Add collision between player and platforms
        this.physics.add.collider(
            this.player,
            this.platforms,
            undefined,
            undefined,
            this
        );

        // Create enemies group
        this.enemies = this.physics.add.group();

        // Add collision between enemies and platforms
        this.physics.add.collider(this.enemies, this.platforms);
        
        // Add overlap between player and enemies
        this.physics.add.overlap(
            this.player,
            this.enemies,
            (player, enemy) => {
                if (enemy instanceof Phaser.Physics.Arcade.Sprite && !this.isInvulnerable && enemy.body) {
                    this.handleEnemyCollision();
                }
            },
            undefined,
            this
        );

        // Create health pickups group
        this.healthPickups = this.physics.add.group();

        // Add collision between health pickups and platforms
        this.physics.add.collider(this.healthPickups, this.platforms);

        // Add overlap between player and health pickups
        this.physics.add.overlap(
            this.player,
            this.healthPickups,
            this.collectHealth,
            undefined,
            this
        );

        // Camera follows the player
        this.cameras.main.startFollow(this.player, true);
        this.cameras.main.setBounds(0, 0, this.worldWidth, 600);

        // Add medieval-style name display
        const nameText = this.add.text(this.player.x, this.player.y - 40, selectedCharacter.name, {
            fontSize: '16px',
            color: '#ffd700',
            fontStyle: 'bold'
        })
        .setOrigin(0.5)
        .setShadow(1, 1, '#000000', 1, true)
        .setScrollFactor(1)
        .setDepth(2);

        // Add lives display (fixed to camera)
        this.livesText = this.add.text(16, 16, '❤︎'.repeat(this.lives), {
            fontSize: '32px',
            color: '#ff0000',
            fontStyle: 'bold'
        })
        .setScrollFactor(0)
        .setDepth(3);

        // Add score display
        this.scoreText = this.add.text(16, 56, 'Score: 0', {
            fontSize: '24px',
            color: '#ffd700',
            fontStyle: 'bold'
        })
        .setScrollFactor(0)
        .setDepth(3);

        // Add character selection button (fixed to camera)
        const buttonWidth = 200;
        const buttonHeight = 40;
        const buttonX = 780;
        const buttonY = 30;

        // Button background
        const selectButton = this.add.rectangle(buttonX, buttonY, buttonWidth, buttonHeight, 0x4a4a4a)
            .setOrigin(1, 0.5)
            .setScrollFactor(0)
            .setDepth(3)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => selectButton.setFillStyle(0x666666))
            .on('pointerout', () => selectButton.setFillStyle(0x4a4a4a))
            .on('pointerdown', () => {
                this.scene.start('CharacterSelectionScene');
            });

        // Button text
        this.add.text(buttonX - buttonWidth/2, buttonY, 'Karakterler', {
            fontSize: '20px',
            color: '#ffffff',
            fontStyle: 'bold'
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(3);

        // Initialize bullets group with tas sprite
        this.bullets = this.physics.add.group({
            defaultKey: 'tas',
            maxSize: 10 // Maximum number of bullets on screen
        });

        // Add collision between bullets and enemies
        this.physics.add.collider(
            this.bullets,
            this.enemies,
            (bulletObj, enemyObj) => {
                const bullet = bulletObj as Phaser.Physics.Arcade.Sprite;
                const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
                
                // Destroy both bullet and enemy
                bullet.destroy();
                enemy.destroy();

                // Increase score
                this.score += 10;
                this.scoreText.setText(`Score: ${this.score}`);
                this.updateGameSpeed();
            },
            undefined,
            this
        );
    }

    generateInitialPlatforms() {
        const groundY = 500;
        let currentX = 0;
        const SAFE_START_DISTANCE = 400;
        const MAX_JUMP_GAP = 250;
        
        while (currentX < 2000) { // Generate initial chunk of platforms
            // Create platform segment
            const platform = this.platforms.create(currentX, groundY, 'platform')
                .setOrigin(0, 0)
                .setDisplaySize(128, 150)
                .setDepth(1);
            
            const body = platform.body as Phaser.Physics.Arcade.StaticBody;
            body.setSize(128, 150);
            body.updateFromGameObject();

            currentX += 128;

            if (currentX > SAFE_START_DISTANCE) {
                if (Math.random() < 0.3) {
                    const gapSize = Math.floor(Math.random() * (MAX_JUMP_GAP - 128) + 128);
                    currentX += gapSize;
                }
            }
        }
        this.lastPlatformX = currentX;
    }

    generateMorePlatforms() {
        const groundY = 500;
        const MAX_JUMP_GAP = 250;
        let currentX = this.lastPlatformX;
        const targetX = this.lastPlatformX + 1000; // Generate 1000px more platforms

        while (currentX < targetX) {
            const platform = this.platforms.create(currentX, groundY, 'platform')
                .setOrigin(0, 0)
                .setDisplaySize(128, 150)
                .setDepth(1);
            
            const body = platform.body as Phaser.Physics.Arcade.StaticBody;
            body.setSize(128, 150);
            body.updateFromGameObject();

            currentX += 128;

            if (Math.random() < 0.3) {
                const gapSize = Math.floor(Math.random() * (MAX_JUMP_GAP - 128) + 128);
                currentX += gapSize;
            }
        }
        this.lastPlatformX = currentX;
    }

    spawnEnemy() {
        // Calculate spawn position (to the right of the camera view)
        const spawnX = this.player.x + 800;
        const spawnY = 500 - 160;

        // Randomly select an enemy type
        const enemyType = this.enemyTypes[Math.floor(Math.random() * this.enemyTypes.length)];

        // Create enemy
        const enemy = this.enemies.create(spawnX, spawnY, enemyType)
            .setDepth(2);

        // Set size based on enemy type
        if (enemyType === 'zehra') {
            const width = 150;
            enemy.setDisplaySize(width, 100); // Width: 150px, Height: 100px
        } else {
            enemy.setDisplaySize(100 * 0.7, 100); // Default size for other enemies
        }

        // Set enemy properties
        enemy.setGravityY(500);
        // Enemy speed scales with player speed
        enemy.setVelocityX(-this.currentSpeed * 0.75); // Enemies move 75% of player speed

        // Add custom property to track enemy type
        (enemy as any).enemyType = enemyType;
    }

    showGameOver() {
        this.isGameOver = true;

        // Stop background music
        this.backgroundMusic.stop();

        // Create semi-transparent black background
        const overlay = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0x000000, 0.7)
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(3);

        // Add game over text
        const gameOverText = this.add.text(400, 200, 'Taşları yerine oturtamadık', {
            fontSize: '48px',
            color: '#ff0000',
            fontStyle: 'bold'
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(3)
        .setShadow(2, 2, '#000000', 2, true);

        this.showEndGameButtons();
    }

    showEndGameButtons() {
        // Common button properties
        const buttonWidth = 250;
        const buttonHeight = 50;
        const buttonStyle = {
            fontSize: '24px',
            color: '#ffffff',
            fontStyle: 'bold'
        };

        // Create restart game button
        const restartButtonX = 400;
        const restartButtonY = 300;

        // Restart button background
        const restartBackground = this.add.rectangle(restartButtonX, restartButtonY, buttonWidth, buttonHeight, 0x4a4a4a)
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(3)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => restartBackground.setFillStyle(0x666666))
            .on('pointerout', () => restartBackground.setFillStyle(0x4a4a4a))
            .on('pointerdown', () => {
                // Stop background music before restarting
                this.backgroundMusic.stop();
                // Properly clean up and restart the scene
                this.scene.stop();
                this.scene.start('GameScene');
            });

        // Restart button text
        const restartText = this.add.text(restartButtonX, restartButtonY, 'Tekrar Dene', buttonStyle)
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(3);

        // Create character selection button
        const selectButtonX = 400;
        const selectButtonY = 370;

        // Character selection button background
        const selectBackground = this.add.rectangle(selectButtonX, selectButtonY, buttonWidth, buttonHeight, 0x4a4a4a)
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(3)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => selectBackground.setFillStyle(0x666666))
            .on('pointerout', () => selectBackground.setFillStyle(0x4a4a4a))
            .on('pointerdown', () => {
                // Stop background music before switching scenes
                this.backgroundMusic.stop();
                // Properly clean up before switching scenes
                this.scene.stop();
                this.scene.start('CharacterSelectionScene');
            });

        // Character selection button text
        const selectText = this.add.text(selectButtonX, selectButtonY, 'Karakterler', buttonStyle)
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(3);

        // Stop all game processes
        this.player.setVelocity(0, 0);
        this.player.body.allowGravity = false;
        this.enemies.clear(true, true); // Remove all enemies
    }

    handleEnemyCollision() {
        if (this.isGameOver) return;

        // Lose 1 life
        this.lives--;
        this.livesText.setText('❤︎'.repeat(this.lives));
        
        if (this.lives <= 0) {
            this.lives = 0;
            this.livesText.setText('');
            this.showGameOver();
            return;
        }

        // Make player temporarily invulnerable
        this.isInvulnerable = true;
        this.player.setAlpha(0.5);

        // Flash the player while invulnerable
        this.time.addEvent({
            delay: 160,
            repeat: 5,
            callback: () => {
                this.player.setAlpha(this.player.alpha === 1 ? 0.5 : 1);
            }
        });

        // Remove invulnerability after 1.6 seconds
        this.time.delayedCall(1600, () => {
            this.isInvulnerable = false;
            this.player.setAlpha(1);
        });
    }

    collectHealth(
        object1: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile,
        object2: Phaser.GameObjects.GameObject | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile
    ) {
        const playerSprite = object1 as Phaser.Physics.Arcade.Sprite;
        const healthPickup = object2 as Phaser.Physics.Arcade.Sprite;
        
        // Remove the health pickup
        healthPickup.destroy();

        // Add life if not at maximum
        if (this.lives < this.maxLives) {
            this.lives++;
            this.livesText.setText('❤︎'.repeat(this.lives));

            // Show floating text effect
            const floatingText = this.add.text(playerSprite.x, playerSprite.y - 50, '+1 Life!', {
                fontSize: '24px',
                color: '#ff0000',
                fontStyle: 'bold'
            }).setOrigin(0.5);

            // Animate the floating text
            this.tweens.add({
                targets: floatingText,
                y: floatingText.y - 50,
                alpha: 0,
                duration: 1000,
                onComplete: () => floatingText.destroy()
            });
        }
    }

    spawnHealthPickup() {
        // Spawn position (ahead of the player)
        const spawnX = this.player.x + Phaser.Math.Between(400, 800);
        const spawnY = 200; // Start above the platforms

        // Create health pickup
        const health = this.healthPickups.create(spawnX, spawnY, 'health')
            .setDisplaySize(40, 40)
            .setDepth(1);

        // Add some physics
        health.setBounce(0.8);
        health.setVelocityX(-50); // Slow movement left
        health.setGravityY(300); // Lighter than player

        // Add floating animation
        this.tweens.add({
            targets: health,
            y: health.y - 20,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });
    }

    shutdown() {
        // Clean up any running timers or events
        this.time.removeAllEvents();
        
        // Clear all enemies
        if (this.enemies) {
            this.enemies.clear(true, true);
        }
        
        // Reset game states
        this.isGameOver = false;
        this.lives = 3;
        this.nextEnemySpawn = 0;
        this.nextHealthSpawn = 0;
        this.isInvulnerable = false;
    }

    updateGameSpeed() {
        // Calculate new speed multiplier based on score
        // Increase speed by 10% for every 25 points
        this.speedMultiplier = 1 + Math.floor(this.score / 25) * 0.1;
        
        // Update current speed
        this.currentSpeed = this.baseSpeed * this.speedMultiplier;

        // Update existing enemies' speed
        this.enemies.getChildren().forEach((gameObject) => {
            const enemy = gameObject as Phaser.Physics.Arcade.Sprite;
            enemy.setVelocityX(-this.currentSpeed * 0.75);
        });
    }

    shootBullet() {
        const currentTime = this.time.now;
        
        // Check if enough time has passed since last shot
        if (currentTime - this.lastShotTime < this.shootCooldown) {
            return;
        }

        // Get a bullet from the pool
        const bullet = this.bullets.get(
            this.player.x + 20, // Always spawn bullet on right side
            this.player.y,
            'tas'
        );

        if (bullet && bullet instanceof Phaser.Physics.Arcade.Sprite) {
            bullet.setActive(true);
            bullet.setVisible(true);
            bullet.setDisplaySize(30, 30);
            bullet.setDepth(1);
            
            // Add rotation animation to the stone
            this.tweens.add({
                targets: bullet,
                angle: 360,
                duration: 500, // Faster rotation to match faster speed
                repeat: -1
            });
            
            // Increased bullet speed from 600 to 900
            const bulletSpeed = 900;
            bullet.setVelocityX(bulletSpeed);
            
            // Reduced lifetime from 2 seconds to 1.5 seconds since it's faster
            this.time.delayedCall(1500, () => {
                if (bullet.active) {
                    bullet.destroy();
                }
            });

            // Update last shot time
            this.lastShotTime = currentTime;
        }
    }

    update(time: number) {
        if (!this.player || !this.cursors || this.isGameOver) return;

        // Check if player has fallen into the void
        if (this.player.y > 500) {
            // Keep player at the bottom of the screen
            this.player.y = 550;
            this.player.setVelocityY(0); // Stop vertical movement
            
            // Allow player to move and jump while in void
            if (this.cursors.up.isDown) {
                this.player.setVelocityY(-562 * Math.sqrt(this.speedMultiplier));
            }
        }

        // Generate more platforms if player is getting close to the end
        if (this.player.x > this.lastPlatformX - 1000) {
            this.generateMorePlatforms();
        }

        // Handle player movement with current speed
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-this.currentSpeed);
            this.player.flipX = false;
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(this.currentSpeed);
            this.player.flipX = true;
        } else {
            this.player.setVelocityX(0);
        }

        // Handle jumping when not in void
        if (this.cursors.up.isDown && this.player.y <= 500 && this.player.body.touching.down) {
            this.player.setVelocityY(-562 * Math.sqrt(this.speedMultiplier));
        }

        // Update background scroll - speed scales with movement
        this.background.tilePositionX = this.cameras.main.scrollX * (0.75 * this.speedMultiplier);

        // Update score and speed
        const newScore = Math.floor(this.player.x / 100);
        if (newScore !== this.score) {
            this.score = newScore;
            this.scoreText.setText(`Score: ${this.score}`);
            this.updateGameSpeed();
        }

        // Spawn enemies
        if (time > this.nextEnemySpawn) {
            this.spawnEnemy();
            // Reduce spawn interval as speed increases
            this.nextEnemySpawn = time + (this.enemySpawnInterval / this.speedMultiplier);
        }

        // Update enemy movement and check for collisions
        this.enemies.getChildren().forEach((gameObject) => {
            const enemy = gameObject as Phaser.Physics.Arcade.Sprite;
            
            // If enemy is in the void, apply random movement
            if (enemy.y > 500) {
                // Keep enemy at the bottom
                enemy.y = 550;
                enemy.setVelocityY(0);
                
                // Random horizontal movement
                if (Math.random() < 0.02) { // 2% chance to change direction each frame
                    enemy.setVelocityX(Phaser.Math.Between(-200, 200));
                }

                // Check for collision with player if both are in void
                if (this.player.y > 500) {
                    if (Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y) < 50) {
                        this.handleEnemyCollision();
                    }
                }
            } else {
                // Normal enemy behavior when on platforms
                enemy.setVelocityX(-this.currentSpeed * 0.75);
            }
            
            // Clean up enemies that are far behind
            if (enemy.x < this.player.x - 1000) {
                enemy.destroy();
            }
        });

        // Check for health pickup spawning
        if (time > this.nextHealthSpawn) {
            this.spawnHealthPickup();
            this.nextHealthSpawn = time + this.healthSpawnInterval;
        }

        // Clean up health pickups that are far behind
        this.healthPickups.getChildren().forEach((gameObject) => {
            const health = gameObject as Phaser.Physics.Arcade.Sprite;
            if (health.x < this.player.x - 1000) {
                health.destroy();
            }
        });

        // Handle shooting
        if (this.spaceKey && this.spaceKey.isDown) {
            this.shootBullet();
        }
    }
} 
export class CharacterSelectionScene extends Phaser.Scene {
    private characters: { name: string; sprite: string }[] = [
        { name: 'Sila', sprite: 'sila' },
        { name: 'Cigdem', sprite: 'cigdem' },
        { name: 'Ilker', sprite: 'ilker' },
        { name: 'Eren', sprite: 'eren' },
        { name: 'Beyza', sprite: 'beyza' },
        { name: 'Ali', sprite: 'ali' },
        { name: 'Zeynep', sprite: 'zeynep' }
    ];
    private zeynepSound!: Phaser.Sound.BaseSound;
    private cigdemSound!: Phaser.Sound.BaseSound;
    private silaSound!: Phaser.Sound.BaseSound;
    private erenSound!: Phaser.Sound.BaseSound;
    private aliSound!: Phaser.Sound.BaseSound;
    private ilkerSound!: Phaser.Sound.BaseSound;

    constructor() {
        super({ key: 'CharacterSelectionScene' });
    }

    preload() {
        // Load character images
        this.characters.forEach(character => {
            this.load.image(character.sprite, `assets/img/${character.sprite}.png`);
        });

        // Load background image
        this.load.image('kale-bg', 'assets/img/kale.jpg');

        // Load character sounds
        this.load.audio('zeynep-sound', 'assets/zeynep.mp3');
        this.load.audio('cigdem-sound', 'assets/cigdem.mp3');
        this.load.audio('sila-sound', 'assets/sıla.mp3');
        this.load.audio('eren-sound', 'assets/eren.mp3');
        this.load.audio('ali-sound', 'assets/ali.mp3');
        this.load.audio('ilker-sound', 'assets/ilker.mp3');
    }

    create() {
        // Initialize character sounds
        this.zeynepSound = this.sound.add('zeynep-sound');
        this.cigdemSound = this.sound.add('cigdem-sound');
        this.silaSound = this.sound.add('sila-sound');
        this.erenSound = this.sound.add('eren-sound');
        this.aliSound = this.sound.add('ali-sound');
        this.ilkerSound = this.sound.add('ilker-sound');

        // Add kale background
        const bg = this.add.image(400, 300, 'kale-bg')
            .setDisplaySize(800, 600)
            .setDepth(0);
        
        // Add semi-transparent overlay to make text more readable
        this.add.rectangle(0, 0, 800, 600, 0x000000, 0.5)
            .setOrigin(0, 0)
            .setDepth(1);
        
        // Add title with medieval style
        this.add.text(400, 80, 'Bir karakter seç, BİM\'in şaşkınlarını\npatakla ve zaferin tadını çıkar!', {
            fontSize: '32px',
            color: '#ffd700',
            fontStyle: 'bold',
            align: 'center',
            lineSpacing: 10
        })
        .setOrigin(0.5)
        .setShadow(2, 2, '#000000', 2, true)
        .setDepth(2);

        // Calculate center position
        const spacing = 180;
        const charactersPerRow = 4;
        const totalWidth = (charactersPerRow - 1) * spacing; // Total width of spaces between characters
        const startX = (800 - totalWidth) / 2; // Center the grid horizontally (800 is screen width)
        const startY = 200;

        this.characters.forEach((character, index) => {
            const x = startX + (index % 4) * spacing;
            const y = startY + Math.floor(index / 4) * spacing;

            // Create character frame with increased depth
            const frame = this.add.rectangle(x, y, 120, 120, 0x4a2810)
                .setInteractive()
                .setStrokeStyle(2, 0xffd700)
                .setDepth(2);

            // Add character sprite with increased depth
            const sprite = this.add.image(x, y, character.sprite)
                .setDisplaySize(100, 100)
                .setDepth(2);

            // Add character name with medieval style and increased depth
            this.add.text(x, y + 70, character.name, {
                fontSize: '20px',
                color: '#ffd700',
                fontStyle: 'bold'
            })
            .setOrigin(0.5)
            .setShadow(1, 1, '#000000', 1, true)
            .setDepth(2);

            // Handle character selection
            frame.on('pointerdown', () => {
                this.selectCharacter(character);
            });

            // Hover effects
            frame.on('pointerover', () => {
                frame.setStrokeStyle(4, 0xffd700);
                frame.setFillStyle(0x6a3810);
                // Play sound if it's Zeynep, Çigdem, Sıla, Eren, Ali, or İlker
                if (character.name === 'Zeynep') {
                    this.zeynepSound.play();
                } else if (character.name === 'Cigdem') {
                    this.cigdemSound.play();
                } else if (character.name === 'Sila') {
                    this.silaSound.play();
                } else if (character.name === 'Eren') {
                    this.erenSound.play();
                } else if (character.name === 'Ali') {
                    this.aliSound.play();
                } else if (character.name === 'Ilker') {
                    this.ilkerSound.play();
                }
            });

            frame.on('pointerout', () => {
                frame.setStrokeStyle(2, 0xffd700);
                frame.setFillStyle(0x4a2810);
            });
        });
    }

    private selectCharacter(character: { name: string; sprite: string }) {
        // Store the selected character in the registry
        this.registry.set('selectedCharacter', character);
        // Start the game scene
        this.scene.start('GameScene');
    }
} 
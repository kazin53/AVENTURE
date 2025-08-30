// Variáveis do jogo
let scene, camera, renderer, player, ground, machine, coins = [], particles = [];
let keys = {}, gameRunning = true;
let playerVelocity = { x: 0, y: 0, z: 0 };

// Sistema de progressão
let playerLevel = 1;
let coinsCarried = 0;
let coinsStored = 0;
let experience = 0;
let maxCarryCapacity = 5;
let playerSpeed = 0.15;
let collectionRange = 1.2;

// Configurações de nível
const levelRequirements = [0, 10, 25, 50, 100, 175, 275, 400, 550, 750, 1000];

// Aumentando o tamanho do mundo em 4x (dobrando a largura e o comprimento)
const worldSize = 200;

let nearMachine = false;

// Variáveis do joystick mobile
let joystickInput = { x: 0, z: 0 };
let joystickActive = false;
const JOYSTICK_DEADZONE = 0.15;
const JOYSTICK_MAX_DISTANCE = 28;

// Variáveis do dash
let isDashing = false;
let dashCooldown = 0;
const DASH_COOLDOWN_TIME = 3000; // 3 segundos
const DASH_DURATION = 200; // 0.2 segundos
const DASH_SPEED_MULTIPLIER = 4; // 4x a velocidade normal

// Adicionando controles de órbita
let controls;

// Variáveis para a animação do personagem Roblox
let playerBody, playerHead, leftArmGroup, rightArmGroup, leftLegGroup, rightLegGroup;

// NOVO: Array para guardar os zumbis
let zombies = []; // <-- TROCADO: dragons para zombies

// NOVO: Posições pré-definidas para os zumbis
const ZOMBIE_SPAWN_POSITIONS = [ // <-- TROCADO: DRAGON para ZOMBIE
    { x: -70, y: 0, z: 70 },
    { x: 70, y: 0, z: 70 },
    { x: -70, y: 0, z: -70 },
    { x: 70, y: 0, z: -70 }
];

// NOVO: Constantes para o comportamento dos zumbis
const ZOMBIE_AGGRO_RANGE = 25; // Distância para começar a perseguir
const ZOMBIE_ATTACK_RANGE = 2.5; // Distância para atacar
const ZOMBIE_SPEED = 0.08; // Velocidade de perseguição (ajustada para ser mais lenta)

// NOVO: Array para guardar as galinhas
let chickens = [];

// Constantes para o comportamento das galinhas
const CHICKEN_SPEED = 0.05;
const CHICKEN_TURN_SPEED = 0.05;
const CHICKEN_WANDER_RADIUS = 30; // Raio em que a galinha vai procurar um novo ponto
const CHICKEN_WANDER_COOLDOWN = 5000; // Tempo em milissegundos para procurar um novo ponto

// Configuração inicial
function init() {
    // Cena
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x87CEEB, worldSize * 0.4, worldSize * 1.5);

    // Câmera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(20, 30, 20); // Posição inicial da câmera ajustada para uma boa visualização

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x87CEEB, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('gameContainer').appendChild(renderer.domElement);

    // Iluminação
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(20, 30, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048; // Otimizado
    directionalLight.shadow.mapSize.height = 2048; // Otimizado
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 300;
    directionalLight.shadow.camera.left = -120;
    directionalLight.shadow.camera.right = 120;
    directionalLight.shadow.camera.top = 120;
    directionalLight.shadow.camera.bottom = -120;
    scene.add(directionalLight);

    // Criar mundo
    createGround();
    // Reutiliza a função de criação de modelo para o jogador
    const playerMaterials = {
        skin: new THREE.MeshLambertMaterial({ color: 0xF1C27D }),
        shirt: new THREE.MeshLambertMaterial({ color: 0x4444aa }),
        pants: new THREE.MeshLambertMaterial({ color: 0x333333 }),
        hair: new THREE.MeshLambertMaterial({ color: 0x2B1B0E }),
        eye: new THREE.MeshLambertMaterial({ color: 0x000000 }),
        mouth: new THREE.MeshLambertMaterial({ color: 0xAA0000 })
    };
    player = createRobloxModel(playerMaterials);
    player.position.set(0, 0, 0); // O modelo já foi ajustado para ter os pés em y=0
    scene.add(player);

    // Salva as referências para as animações do jogador
    playerBody = player.getObjectByName('playerBody');
    playerHead = player.getObjectByName('playerHead');
    leftArmGroup = player.getObjectByName('leftArmGroup');
    rightArmGroup = player.getObjectByName('rightArmGroup');
    leftLegGroup = player.getObjectByName('leftLegGroup');
    rightLegGroup = player.getObjectByName('rightLegGroup');

    createMachine();
    spawnCoins();
    // CHAMA A FUNÇÃO PARA CRIAR AS ÁRVORES
    spawnGameTrees();

    // NOVO: Criar galinhas
    spawnChickens();

    // NOVO: Criar zumbis
    spawnZombies(); // <-- TROCADO: spawnDragons para spawnZombies

    // Controles de órbita para a câmera
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0); // Foca a câmera no novo personagem, que agora está em y=0
    controls.enableDamping = true; // Mantém a inércia para um movimento mais suave
    controls.dampingFactor = 0.1;
    controls.enablePan = false; // Desativa a capacidade de "pan"
    controls.enableZoom = false; // Desativa o zoom

    // Fixa a distância da câmera
    controls.minDistance = 15;
    controls.maxDistance = 15;
    controls.maxPolarAngle = Math.PI / 2.2; // Limita a rotação vertical

    controls.update();

    // Event listeners
    setupControls();

    // Inicializar UI
    updateUI();

    // Iniciar loop do jogo
    animate();
}

function createGround() {
    // Chão principal
    const groundGeometry = new THREE.PlaneGeometry(worldSize * 2, worldSize * 2);
    const groundMaterial = new THREE.MeshLambertMaterial({
        color: 0x90EE90,
        transparent: true,
        opacity: 0.9
    });
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Adicionar detalhes ao chão
    createGroundDetails();

    // Bordas do mundo
    createWorldBorders();
}

function createGroundDetails() {
    // OTIMIZAÇÃO: Usando InstancedMesh para grama, flores e pedras
    const grassCount = 3200;
    const flowerCount = 800;
    const rockCount = 480;
    const groundArea = worldSize * 1.8;

    // Grama
    const grassGeometry = new THREE.ConeGeometry(0.1, 0.5, 4);
    const grassMaterial = new THREE.MeshLambertMaterial({ flatShading: true });
    const grassInstancedMesh = new THREE.InstancedMesh(grassGeometry, grassMaterial, grassCount);
    const grassMatrix = new THREE.Matrix4();
    const grassColor = new THREE.Color();
    for (let i = 0; i < grassCount; i++) {
        grassMatrix.makeRotationY(Math.random() * Math.PI * 2);
        grassMatrix.setPosition(
            (Math.random() - 0.5) * groundArea,
            0.25,
            (Math.random() - 0.5) * groundArea
        );
        grassInstancedMesh.setMatrixAt(i, grassMatrix);
        grassInstancedMesh.setColorAt(i, grassColor.setHSL(0.3 + Math.random() * 0.1, 0.8, 0.4 + Math.random() * 0.3));
    }
    grassInstancedMesh.castShadow = true;
    scene.add(grassInstancedMesh);

    // Flores
    const flowerGeometry = new THREE.SphereGeometry(0.08, 6, 6);
    const flowerMaterial = new THREE.MeshLambertMaterial({ flatShading: true });
    const flowerInstancedMesh = new THREE.InstancedMesh(flowerGeometry, flowerMaterial, flowerCount);
    const flowerMatrix = new THREE.Matrix4();
    const flowerColor = new THREE.Color();
    for (let i = 0; i < flowerCount; i++) {
        flowerMatrix.makeTranslation(
            (Math.random() - 0.5) * groundArea,
            0.08,
            (Math.random() - 0.5) * groundArea
        );
        flowerInstancedMesh.setMatrixAt(i, flowerMatrix);
        flowerInstancedMesh.setColorAt(i, flowerColor.setHSL(Math.random(), 0.8, 0.7));
    }
    scene.add(flowerInstancedMesh);

    // Pedras
    const rockGeometry = new THREE.DodecahedronGeometry(0.2 + Math.random() * 0.3);
    const rockMaterial = new THREE.MeshLambertMaterial({ color: 0x696969, flatShading: true });
    const rockInstancedMesh = new THREE.InstancedMesh(rockGeometry, rockMaterial, rockCount);
    const rockMatrix = new THREE.Matrix4();
    for (let i = 0; i < rockCount; i++) {
        rockMatrix.makeRotationFromEuler(new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI));
        rockMatrix.setPosition(
            (Math.random() - 0.5) * groundArea,
            0.2,
            (Math.random() - 0.5) * groundArea
        );
        rockInstancedMesh.setMatrixAt(i, rockMatrix);
    }
    rockInstancedMesh.castShadow = true;
    scene.add(rockInstancedMesh);
}

function createWorldBorders() {
    const borderHeight = 3;
    const borderWidth = 0.5;
    const borderMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });

    // Bordas
    const borders = [
        { x: 0, z: worldSize, w: worldSize * 2, h: borderWidth },
        { x: 0, z: -worldSize, w: worldSize * 2, h: borderWidth },
        { x: worldSize, z: 0, w: borderWidth, h: worldSize * 2 },
        { x: -worldSize, z: 0, w: borderWidth, h: worldSize * 2 }
    ];

    borders.forEach(border => {
        const geometry = new THREE.BoxGeometry(border.w, borderHeight, border.h);
        const mesh = new THREE.Mesh(geometry, borderMaterial);
        mesh.position.set(border.x, borderHeight / 2, border.z);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        scene.add(mesh);
    });
}

// NOVO: Função refatorada para criar o modelo Roblox
function createRobloxModel(materials) {
    const model = new THREE.Group();

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), materials.skin);
    head.position.set(0, 1.7, 0);
    head.castShadow = true;
    head.name = 'playerHead';
    model.add(head);

    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.3, 0.65), materials.hair);
    hair.position.set(0, 1.99, 0);
    hair.castShadow = true;
    model.add(hair);

    const eyeGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.02);
    const leftEye = new THREE.Mesh(eyeGeometry, materials.eye);
    leftEye.position.set(-0.15, 1.71, 0.31);
    model.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, materials.eye);
    rightEye.position.set(0.15, 1.71, 0.31);
    model.add(rightEye);

    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.02), materials.mouth);
    mouth.position.set(0, 1.5, 0.31);
    model.add(mouth);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.4), materials.shirt);
    body.position.set(0, 0.8, 0);
    body.castShadow = true;
    body.name = 'playerBody';
    model.add(body);

    const armGeometry = new THREE.BoxGeometry(0.25, 1.0, 0.25);
    const armMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });

    const leftArmGroup = new THREE.Group();
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.y = -0.5;
    leftArm.castShadow = true;
    leftArmGroup.add(leftArm);
    leftArmGroup.position.set(-0.625, 1.5, 0);
    leftArmGroup.name = 'leftArmGroup';
    model.add(leftArmGroup);

    const rightArmGroup = new THREE.Group();
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.y = -0.5;
    rightArm.castShadow = true;
    rightArmGroup.add(rightArm);
    rightArmGroup.position.set(0.625, 1.5, 0);
    rightArmGroup.name = 'rightArmGroup';
    model.add(rightArmGroup);

    const legGeometry = new THREE.BoxGeometry(0.35, 1.2, 0.35);

    const leftLegGroup = new THREE.Group();
    const leftLeg = new THREE.Mesh(legGeometry, materials.pants);
    leftLeg.position.y = -0.6;
    leftLegGroup.add(leftLeg);
    leftLegGroup.position.set(-0.25, 0.2, 0);
    leftLegGroup.name = 'leftLegGroup';
    model.add(leftLegGroup);

    const rightLegGroup = new THREE.Group();
    const rightLeg = new THREE.Mesh(legGeometry, materials.pants);
    rightLeg.position.y = -0.6;
    rightLegGroup.add(rightLeg);
    rightLegGroup.position.set(0.25, 0.2, 0);
    rightLegGroup.name = 'rightLegGroup';
    model.add(rightLegGroup);

    // Ajusta a altura da base do modelo para y=0
    model.position.y = 1.2 / 2;
    
    return model;
}


function createMachine() {
    machine = new THREE.Group();
    machine.position.set(0, 0, 0);
    scene.add(machine);

    // Base da máquina
    const baseGeometry = new THREE.CylinderGeometry(2, 2.5, 1, 8);
    const baseMaterial = new THREE.MeshLambertMaterial({ color: 0x4169E1 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.5;
    base.castShadow = true;
    base.receiveShadow = true;
    machine.add(base);

    // Corpo principal
    const bodyGeometry = new THREE.CylinderGeometry(1.5, 1.8, 3, 8);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: 0x1E90FF });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 2.5;
    body.castShadow = true;
    machine.add(body);

    // Topo da máquina
    const topGeometry = new THREE.CylinderGeometry(1, 1.5, 0.5, 8);
    const topMaterial = new THREE.MeshLambertMaterial({ color: 0x00BFFF });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = 4.25;
    top.castShadow = true;
    machine.add(top);

    // Slot para moedas
    const slotGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.3);
    const slotMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
    const slot = new THREE.Mesh(slotGeometry, slotMaterial);
    slot.position.set(0, 3, 1.6);
    machine.add(slot);

    // Tela da máquina
    const screenGeometry = new THREE.PlaneGeometry(1.2, 0.8);
    const screenMaterial = new THREE.MeshLambertMaterial({
        color: 0x00FF00,
        emissive: 0x002200
    });
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.set(0, 2.5, 1.85);
    machine.add(screen);

    // Luzes da máquina
    for (let i = 0; i < 4; i++) {
        const lightGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const lightMaterial = new THREE.MeshLambertMaterial({
            color: i % 2 === 0 ? 0xFF0000 : 0x00FF00,
            emissive: i % 2 === 0 ? 0x330000 : 0x003300
        });
        const light = new THREE.Mesh(lightGeometry, lightMaterial);

        const angle = (i / 4) * Math.PI * 2;
        light.position.set(
            Math.cos(angle) * 1.2,
            4.5,
            Math.sin(angle) * 1.2
        );
        machine.add(light);
        light.userData = { isLight: true, originalEmissive: light.material.emissive.clone() };
    }

    // Área de detecção da máquina
    machine.userData = { interactionRadius: 3 };
}

function spawnCoins() {
    // OTIMIZAÇÃO: Limita o número de moedas ativas a 150 para melhor performance
    const coinsToSpawn = Math.min(150, 150 + playerLevel * 20);

    for (let i = coins.length; i < coinsToSpawn; i++) {
        spawnCoin();
    }
}

function spawnCoin() {
    const coinGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.15, 12);
    const coinMaterial = new THREE.MeshLambertMaterial({
        color: 0xFFD700,
        emissive: 0x332200
    });
    const coin = new THREE.Mesh(coinGeometry, coinMaterial);

    // Posição aleatória longe da máquina
    let x, z;
    do {
        x = (Math.random() - 0.5) * worldSize * 1.8;
        z = (Math.random() - 0.5) * worldSize * 1.8;
    } while (Math.sqrt(x * x + z * z) < 8); // Manter distância da máquina

    coin.position.set(x, 0.8, z);
    coin.castShadow = true;
    coin.userData = {
        collected: false,
        rotationSpeed: 0.08,
        floatOffset: Math.random() * Math.PI * 2
    };

    scene.add(coin);
    coins.push(coin);

    // Efeito de brilho
    const glowGeometry = new THREE.RingGeometry(0.5, 0.7, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFD700,
        transparent: true,
        opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(coin.position);
    glow.position.y = 0.1;
    glow.rotation.x = -Math.PI / 2;
    scene.add(glow);
    coin.userData.glow = glow;
}

// --- INÍCIO DO CÓDIGO DA ÁRVORE SIMPLIFICADA ---

// Função para criar cilindro (tronco)
// Removido o afilamento para simplificar
function createSimpleBranch(radius, height, color = 0x654321, segments = 8) {
    const geometry = new THREE.CylinderGeometry(radius, radius, height, segments);
    const material = new THREE.MeshLambertMaterial({
        color: color,
        flatShading: true
    });
    const branch = new THREE.Mesh(geometry, material);
    branch.castShadow = true;
    return branch;
}

// Função para criar a folhagem da árvore (usando um cone)
// O cone é mais simples e versátil para formas de árvores estilizadas
function createSimpleFoliage(radius, height, color, segments = 8) {
    const geometry = new THREE.ConeGeometry(radius, height, segments);
    const material = new THREE.MeshLambertMaterial({
        color: color,
        flatShading: true
    });
    const foliage = new THREE.Mesh(geometry, material);
    foliage.castShadow = true;
    return foliage;
}

// Função para criar uma única árvore de jogo simplificada
function createGameTree() {
    const treeGroup = new THREE.Group();

    // Tronco principal: um cilindro simples
    const trunkHeight = 10;
    const trunk = createSimpleBranch(1.5, trunkHeight);
    trunk.position.y = trunkHeight / 2;
    treeGroup.add(trunk);

    // Folhagem: um ou dois cones para formar a copa
    const foliageColor = new THREE.Color().setHSL(
        0.33 + (Math.random() - 0.5) * 0.1, // Variação de cor
        0.6 + Math.random() * 0.3,
        0.3 + Math.random() * 0.2
    );

    // Cone inferior
    const bottomCone = createSimpleFoliage(6, 10, foliageColor);
    bottomCone.position.y = trunkHeight - 2;
    treeGroup.add(bottomCone);

    // Cone superior (opcional, para um visual mais completo)
    const topCone = createSimpleFoliage(4, 7, foliageColor);
    topCone.position.y = trunkHeight + 5;
    treeGroup.add(topCone);

    return treeGroup;
}

// Função para espalhar as árvores no mapa
function spawnGameTrees() {
    const numTrees = 30; // OTIMIZAÇÃO: Reduzido de 100 para 30
    const worldRadius = worldSize * 0.85;

    for (let i = 0; i < numTrees; i++) {
        const tree = createGameTree();

        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * worldRadius;

        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        tree.position.set(x, 0, z);

        // Variação de escala e rotação
        const scale = 0.7 + Math.random() * 0.6;
        tree.scale.set(scale, scale, scale);
        tree.rotation.y = Math.random() * Math.PI * 2;

        scene.add(tree);
    }
}
// --- FIM DO CÓDIGO DA ÁRVORE SIMPLIFICADA ---

function setupControls() {
    document.addEventListener('keydown', (event) => {
        keys[event.code] = true;

        // Interação com a máquina
        if (event.code === 'Space' && nearMachine && coinsCarried > 0) {
            depositCoins();
        }

        // Iniciar o dash
        if (event.code === 'ShiftLeft' && !isDashing && dashCooldown <= 0) {
            startDash();
        }
    });

    document.addEventListener('keyup', (event) => {
        keys[event.code] = false;
    });

    // Controles mobile
    setupMobileControls();

    window.addEventListener('resize', onWindowResize);
}

function setupMobileControls() {
    const joystick = document.getElementById('joystick');
    const joystickKnob = document.getElementById('joystickKnob');
    const jumpButton = document.getElementById('jumpButton');
    const dashButton = document.getElementById('dashButton');

    function getTouchPos(e) {
        const rect = joystick.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const touch = e.touches[0] || e.changedTouches[0];

        return {
            x: touch.clientX - centerX,
            y: touch.clientY - centerY
        };
    }

    joystick.addEventListener('touchstart', (e) => {
        e.preventDefault();
        joystickActive = true;
    });

    joystick.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!joystickActive) return;

        const pos = getTouchPos(e);
        const distance = Math.sqrt(pos.x * pos.x + pos.y * pos.y);

        let finalX = pos.x;
        let finalY = pos.y;

        if (distance > JOYSTICK_MAX_DISTANCE) {
            const angle = Math.atan2(pos.y, pos.x);
            finalX = Math.cos(angle) * JOYSTICK_MAX_DISTANCE;
            finalY = Math.sin(angle) * JOYSTICK_MAX_DISTANCE;
        }

        joystickKnob.style.transform = `translate(calc(-50% + ${finalX}px), calc(-50% + ${finalY}px))`;

        const normalizedDistance = Math.min(distance, JOYSTICK_MAX_DISTANCE) / JOYSTICK_MAX_DISTANCE;

        if (normalizedDistance > JOYSTICK_DEADZONE) {
            const adjustedDistance = (normalizedDistance - JOYSTICK_DEADZONE) / (1 - JOYSTICK_DEADZONE);
            const angle = Math.atan2(finalY, finalX);

            joystickInput.x = Math.cos(angle) * adjustedDistance;
            joystickInput.z = Math.sin(angle) * adjustedDistance;
        } else {
            joystickInput.x = 0;
            joystickInput.z = 0;
        }
    });

    joystick.addEventListener('touchend', (e) => {
        e.preventDefault();
        joystickActive = false;
        joystickKnob.style.transform = 'translate(-50%, -50%)';
        joystickInput = { x: 0, z: 0 };
    });

    joystick.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        joystickActive = false;
        joystickKnob.style.transform = 'translate(-50%, -50%)';
        joystickInput = { x: 0, z: 0 };
    });

    jumpButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys['Space'] = true;
        if (nearMachine && coinsCarried > 0) {
            depositCoins();
        }
    });

    jumpButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        keys['Space'] = false;
    });

    dashButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!isDashing && dashCooldown <= 0) {
            startDash();
        }
    });
}

function updatePlayer() {
    if (!gameRunning) return;

    const jumpPower = 0.35;
    const gravity = -0.025;
    // inercia dw movimento ao andar
    let friction = 0.75;

    // Criar um vetor de movimento
    let moveDirection = new THREE.Vector3(0, 0, 0);

    // Movimento horizontal - Teclado
    if (keys['KeyW'] || keys['ArrowUp']) {
        moveDirection.z = -1;
    }
    if (keys['KeyS'] || keys['ArrowDown']) {
        moveDirection.z = 1;
    }
    if (keys['KeyA'] || keys['ArrowLeft']) {
        moveDirection.x = -1;
    }
    if (keys['KeyD'] || keys['ArrowRight']) {
        moveDirection.x = 1;
    }

    // Movimento horizontal - Joystick mobile
    if (Math.abs(joystickInput.x) > 0 || Math.abs(joystickInput.z) > 0) {
        moveDirection.x = joystickInput.x;
        moveDirection.z = joystickInput.z;
    }

    // Velocidade atual do jogador
    let currentSpeed = playerSpeed;

    // Se o jogador estiver correndo (isDashing), aumenta a velocidade
    if (isDashing) {
        currentSpeed *= DASH_SPEED_MULTIPLIER;
        friction = 0.96; // Reduz a fricção durante o dash
    }

    // Normalizar o vetor de direção para movimento consistente
    if (moveDirection.length() > 0) {
        moveDirection.normalize();

        // Aplicar a rotação da câmera ao movimento do jogador
        const angle = controls.getAzimuthalAngle();
        const tempVector = new THREE.Vector3(moveDirection.x, 0, moveDirection.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);

        // Aplica a velocidade atual (incluindo o dash)
        playerVelocity.x += tempVector.x * currentSpeed;
        playerVelocity.z += tempVector.z * currentSpeed;

        // Rotacionar o pato para a direção do movimento
        const targetRotation = Math.atan2(tempVector.x, tempVector.z);
        player.rotation.y += (targetRotation - player.rotation.y) * 0.99;
    }

    // Pulo
    const onGround = player.position.y <= 0.6; // O centro do jogador está em y=0.6
    if (keys['Space'] && onGround) {
        playerVelocity.y = jumpPower;
    }

    // Aplicar gravidade
    if (!onGround) {
        playerVelocity.y += gravity;
    } else {
        playerVelocity.y = 0;
        player.position.y = 0.6; // Ajustado para o novo personagem
    }

    // Aplicar fricção
    playerVelocity.x *= friction;
    playerVelocity.z *= friction;

    // Atualizar posição
    player.position.x += playerVelocity.x;
    player.position.y += playerVelocity.y;
    player.position.z += playerVelocity.z;

    // Limitar movimento dentro do mundo (ajustado para o novo tamanho)
    const boundary = worldSize - 2;
    player.position.x = Math.max(-boundary, Math.min(boundary, player.position.x));
    player.position.z = Math.max(-boundary, Math.min(boundary, player.position.z));

    // Apenas atualiza o ponto de foco da câmera para a posição do jogador
    controls.target.copy(player.position);

    // Verificar colisões e interações
    checkCoinCollection();
    checkMachineProximity();

    // Animações do jogador
    updatePlayerAnimations();

    // Atualizar cooldown do dash
    if (dashCooldown > 0) {
        dashCooldown -= 1000 / 60; // Reduz o cooldown a cada quadro
    }
}

function startDash() {
    isDashing = true;
    createDashEffect();

    setTimeout(() => {
        isDashing = false;
        dashCooldown = DASH_COOLDOWN_TIME;
    }, DASH_DURATION);
}

function updatePlayerAnimations() {
    const isMoving = Math.abs(playerVelocity.x) > 0.01 || Math.abs(playerVelocity.z) > 0.01;

    // Animação de "balançar" (subir/descer) enquanto anda
    if (isMoving) {
        player.position.y = 0.6 + Math.sin(Date.now() * 0.015) * 0.05;

        // Animação de braços e pernas de um personagem Roblox (simples)
        let walkCycleSpeed = isDashing ? 0.03 : 0.02;
        let walkCycle = Math.sin(Date.now() * walkCycleSpeed) * Math.PI / 4;
        leftArmGroup.rotation.x = walkCycle;
        rightArmGroup.rotation.x = -walkCycle;
        leftLegGroup.rotation.x = -walkCycle;
        rightLegGroup.rotation.x = walkCycle;

    } else {
        // Suaviza o retorno à posição vertical original
        player.position.y += (0.6 - player.position.y) * 0.1;

        // Retorna braços e pernas para a posição inicial
        leftArmGroup.rotation.x += (0 - leftArmGroup.rotation.x) * 0.1;
        rightArmGroup.rotation.x += (0 - rightArmGroup.rotation.x) * 0.1;
        leftLegGroup.rotation.x += (0 - leftLegGroup.rotation.x) * 0.1;
        rightLegGroup.rotation.x += (0 - rightLegGroup.rotation.x) * 0.1;
    }
}

function createDashEffect() {
    // Partículas de dash
    for (let i = 0; i < 15; i++) {
        const particleGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.15);
        const particleMaterial = new THREE.MeshLambertMaterial({
            color: new THREE.Color().setHSL(0.6 + Math.random() * 0.1, 0.8, 0.6)
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);

        particle.position.copy(player.position);

        // Adiciona um pequeno recuo para simular o rastro
        particle.position.x -= playerVelocity.x * 1.5;
        particle.position.z -= playerVelocity.z * 1.5;

        particle.userData = {
            velocity: {
                x: (Math.random() - 0.5) * 0.1,
                y: Math.random() * 0.1,
                z: (Math.random() - 0.5) * 0.1
            },
            life: 20,
            maxLife: 20
        };

        scene.add(particle);
        particles.push(particle);
    }
}

function checkCoinCollection() {
    if (coinsCarried >= maxCarryCapacity) return;

    // Loop decrescente para remover elementos do array de forma segura
    for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        if (coin.userData.collected) continue;

        const distance = player.position.distanceTo(coin.position);
        if (distance < collectionRange) {
            coin.userData.collected = true;
            scene.remove(coin);
            if (coin.userData.glow) {
                scene.remove(coin.userData.glow);
            }

            coinsCarried++;
            createCollectEffect(coin.position);
            updateUI();

            // Remover da lista
            coins.splice(i, 1);

            // Spawnar nova moeda se necessário (mantém a quantidade de moedas alta no mapa)
            if (coins.length < 150) {
                spawnCoin();
            }
        }
    }
}

function checkMachineProximity() {
    const distance = player.position.distanceTo(machine.position);
    const wasNear = nearMachine;
    nearMachine = distance < machine.userData.interactionRadius;

    const prompt = document.getElementById('machinePrompt');
    if (nearMachine && coinsCarried > 0) {
        prompt.style.display = 'block';
        prompt.textContent = `Pressione ESPAÇO para guardar ${coinsCarried} moedas!`;
    } else {
        prompt.style.display = 'none';
    }

    // Animar luzes da máquina quando próximo
    if (nearMachine !== wasNear) {
        machine.children.forEach(child => {
            if (child.userData.isLight) {
                if (nearMachine) {
                    child.material.emissive.multiplyScalar(2);
                } else {
                    child.material.emissive.copy(child.userData.originalEmissive);
                }
            }
        });
    }
}

function depositCoins() {
    if (coinsCarried === 0) return;

    coinsStored += coinsCarried;
    experience += coinsCarried;

    createDepositEffect();

    coinsCarried = 0;

    // Verificar level up
    checkLevelUp();

    updateUI();
}

function checkLevelUp() {
    const nextLevelReq = levelRequirements[playerLevel] || levelRequirements[levelRequirements.length - 1] + (playerLevel - levelRequirements.length + 1) * 200;

    if (experience >= nextLevelReq) {
        playerLevel++;
        levelUp();
    }
}

function levelUp() {
    // Melhorar estatísticas do jogador
    maxCarryCapacity += 2;
    playerSpeed += 0.02;
    collectionRange += 0.1;

    // Mostrar notificação
    showLevelUpNotification();

    // Efeito visual
    createLevelUpEffect();

    // Spawnar mais moedas
    spawnCoins();

    updateUI();
}

function showLevelUpNotification() {
    const notification = document.getElementById('levelUpNotification');
    const newLevelText = document.getElementById('newLevelText');
    const levelUpBonus = document.getElementById('levelUpBonus');

    newLevelText.textContent = `Nível ${playerLevel}`;
    levelUpBonus.textContent = `Capacidade: +2 | Velocidade: +2% | Alcance: +10%`;

    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

function createCollectEffect(position) {
    for (let i = 0; i < 10; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.05, 6, 6);
        const particleMaterial = new THREE.MeshLambertMaterial({
            color: new THREE.Color().setHSL(0.15, 1, 0.7)
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);

        particle.position.copy(position);
        particle.userData = {
            velocity: {
                x: (Math.random() - 0.5) * 0.2,
                y: Math.random() * 0.2,
                z: (Math.random() - 0.5) * 0.2
            },
            life: 30,
            maxLife: 30
        };

        scene.add(particle);
        particles.push(particle);
    }
}

function createDepositEffect() {
    for (let i = 0; i < 20; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.08, 6, 6);
        const particleMaterial = new THREE.MeshLambertMaterial({
            color: new THREE.Color().setHSL(0.3, 0.8, 0.6)
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);

        particle.position.copy(machine.position);
        particle.position.y += 2;
        particle.userData = {
            velocity: {
                x: (Math.random() - 0.5) * 0.3,
                y: Math.random() * 0.4,
                z: (Math.random() - 0.5) * 0.3
            },
            life: 40,
            maxLife: 40
        };

        scene.add(particle);
        particles.push(particle);
    }
}

function createLevelUpEffect() {
    const effect = document.createElement('div');
    effect.className = 'screenEffect levelUpEffect';
    document.getElementById('gameContainer').appendChild(effect);

    setTimeout(() => {
        effect.remove();
    }, 1000);

    // Partículas especiais
    for (let i = 0; i < 30; i++) {
        const particleGeometry = new THREE.OctahedronGeometry(0.1);
        const particleMaterial = new THREE.MeshLambertMaterial({
            color: new THREE.Color().setHSL(Math.random(), 0.8, 0.7)
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);

        particle.position.copy(player.position);
        particle.userData = {
            velocity: {
                x: (Math.random() - 0.5) * 0.4,
                y: Math.random() * 0.5,
                z: (Math.random() - 0.5) * 0.4
            },
            life: 60,
            maxLife: 60
        };

        scene.add(particle);
        particles.push(particle);
    }
}

function updateCoins() {
    coins.forEach(coin => {
        if (!coin.userData.collected) {
            coin.rotation.y += coin.userData.rotationSpeed;
            coin.position.y = 0.8 + Math.sin(Date.now() * 0.008 + coin.userData.floatOffset) * 0.1;

            if (coin.userData.glow) {
                coin.userData.glow.rotation.z += 0.02;
                coin.userData.glow.material.opacity = 0.3 + Math.sin(Date.now() * 0.01) * 0.2;
            }
        }
    });
}

function updateMachine() {
    // Animar luzes da máquina
    machine.children.forEach(child => {
        if (child.userData.isLight) {
            const intensity = nearMachine ? 2 : 1;
            const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
            child.material.emissive.copy(child.userData.originalEmissive);
            child.material.emissive.multiplyScalar(intensity * pulse);
        }
    });
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.userData.life--;

        if (particle.userData.life <= 0) {
            scene.remove(particle);
            particles.splice(i, 1);
            continue;
        }

        particle.position.x += particle.userData.velocity.x;
        particle.position.y += particle.userData.velocity.y;
        particle.position.z += particle.userData.velocity.z;

        particle.userData.velocity.y -= 0.01;

        const alpha = particle.userData.life / particle.userData.maxLife;
        particle.material.opacity = alpha;
        particle.material.transparent = true;
        particle.scale.setScalar(alpha);
    }
}

function updateUI() {
    document.getElementById('level').textContent = `Nível ${playerLevel}`;
    document.getElementById('coinsCarried').textContent = `Moedas: ${coinsCarried}/${maxCarryCapacity}`;
    document.getElementById('coinsStored').textContent = `Guardadas: ${coinsStored}`;

    const nextLevelReq = levelRequirements[playerLevel] || levelRequirements[levelRequirements.length - 1] + (playerLevel - levelRequirements.length + 1) * 200;
    const progress = Math.min(experience / nextLevelReq * 100, 100);

    document.getElementById('experienceFill').style.width = progress + '%';
    document.getElementById('nextLevelInfo').textContent = `Próximo nível: ${Math.max(0, nextLevelReq - experience)} moedas`;

    // Atualizar estatísticas
    const stats = document.querySelectorAll('.stat');
    stats[0].textContent = `Velocidade: ${Math.round((playerSpeed / 0.15) * 100)}%`;
    stats[1].textContent = `Capacidade: ${maxCarryCapacity} moedas`;
    stats[2].textContent = `Alcance: ${Math.round((collectionRange / 1.2) * 100)}%`;

    // Atualizar status do dash
    const dashStatusElement = document.getElementById('dashStatus');
    if (dashCooldown > 0) {
        const remainingTime = Math.ceil(dashCooldown / 1000);
        dashStatusElement.textContent = `Dash: ${remainingTime}s`;
    } else {
        dashStatusElement.textContent = `Dash: Pronto`;
    }
}

function animate() {
    requestAnimationFrame(animate);

    updatePlayer();
    updateCoins();
    updateMachine();
    updateParticles();
    // NOVO: Chama a função que atualiza os zumbis
    updateZombies(); // <-- TROCADO: updateDragons para updateZombies
    
    // NOVO: Chama a função que atualiza as galinhas
    updateChickens();

    // Atualiza os controles em cada quadro para permitir a rotação
    controls.update();

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- NOVO: LÓGICA DO ZUMBI (SUBSTITUINDO O DRAGÃO) ---

// Função que cria um único zumbi
function createZombie() {
    const zombieMaterials = {
        skin: new THREE.MeshLambertMaterial({ color: 0x6B8E23 }), // Verde oliva
        shirt: new THREE.MeshLambertMaterial({ color: 0x5D4A27 }), // Marrom sujo
        pants: new THREE.MeshLambertMaterial({ color: 0x4A4A4A }), // Cinza
        hair: new THREE.MeshLambertMaterial({ color: 0x2B1B0E }),
        eye: new THREE.MeshLambertMaterial({ color: 0x00FF00 }), // Olhos verdes
        mouth: new THREE.MeshLambertMaterial({ color: 0x800000 }) // Boca vermelha
    };

    const zombie = createRobloxModel(zombieMaterials);
    zombie.userData = {
        mode: 'idle',
        attackCooldown: 0,
        attackTimeout: null
    };

    zombie.scale.set(1.5, 1.5, 1.5);
    // Ajusta a altura da base do modelo para y=0
    zombie.position.y = 1.2 / 2 * 1.5;
    
    // Salva as referências para as animações
    zombie.userData.leftArmGroup = zombie.getObjectByName('leftArmGroup');
    zombie.userData.rightArmGroup = zombie.getObjectByName('rightArmGroup');
    zombie.userData.leftLegGroup = zombie.getObjectByName('leftLegGroup');
    zombie.userData.rightLegGroup = zombie.getObjectByName('rightLegGroup');

    return zombie;
}

// Função que cria os zumbis nas posições definidas
function spawnZombies() {
    ZOMBIE_SPAWN_POSITIONS.forEach(pos => {
        const zombie = createZombie();
        zombie.position.set(pos.x, 0, pos.z);
        scene.add(zombie);
        zombies.push(zombie);
    });
}

// Função que atualiza o comportamento e animação dos zumbis
function updateZombies() {
    zombies.forEach(zombie => {
        const distanceToPlayer = zombie.position.distanceTo(player.position);
        const dt = 1 / 60; // Delta time para movimento consistente

        // Animação de "balançar" (subir/descer)
        zombie.position.y = (1.2 / 2 * 1.5) + Math.sin(Date.now() * 0.005) * 0.1;

        // Animação de caminhar (braços e pernas)
        let walkCycle = Math.sin(Date.now() * 0.015) * Math.PI / 8;
        zombie.userData.leftArmGroup.rotation.x = walkCycle;
        zombie.userData.rightArmGroup.rotation.x = -walkCycle;
        zombie.userData.leftLegGroup.rotation.x = -walkCycle;
        zombie.userData.rightLegGroup.rotation.x = walkCycle;

        if (distanceToPlayer < ZOMBIE_AGGRO_RANGE && zombie.userData.mode === 'idle') {
            console.log('Zumbi avistou o jogador!');
            zombie.userData.mode = 'chasing';
        }

        if (zombie.userData.mode === 'chasing') {
            if (distanceToPlayer > ZOMBIE_ATTACK_RANGE) {
                const direction = new THREE.Vector3().subVectors(player.position, zombie.position).normalize();
                zombie.position.add(direction.multiplyScalar(ZOMBIE_SPEED * dt * 100));

                zombie.lookAt(player.position);
            } else {
                // Ataque!
                zombie.userData.mode = 'attacking';
                attackPlayer(zombie);
            }
        }
    });
}

// Função de ataque ao jogador
function attackPlayer(zombie) {
    if (coinsCarried > 0) {
        const coinsLost = Math.ceil(coinsCarried / 2);
        coinsCarried -= coinsLost;
        updateUI();
        console.log(`Você foi atacado! Perdeu ${coinsLost} moedas.`);

        // Efeito visual de ataque (braço do zumbi)
        if (zombie.userData.attackTimeout) {
            clearTimeout(zombie.userData.attackTimeout);
        }
        zombie.userData.leftArmGroup.rotation.x = -Math.PI / 4;
        zombie.userData.attackTimeout = setTimeout(() => {
            zombie.userData.leftArmGroup.rotation.x = 0;
            zombie.userData.mode = 'idle'; // Reseta o modo após o ataque
        }, 200);
    } else {
        zombie.userData.mode = 'idle';
    }
}

// --- NOVO: LÓGICA DA GALINHA ---

function createChicken() {
    const chicken = new THREE.Group();
    
    // Materiais
    const whiteMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
    const redMaterial = new THREE.MeshLambertMaterial({ color: 0xFF4500 });
    const orangeMaterial = new THREE.MeshLambertMaterial({ color: 0xFFA500 });
    const blackMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
    
    // Escala para a galinha
    const scale = 0.5; // Ajuste a escala para que a galinha não seja muito grande
    chicken.scale.set(scale, scale, scale);

    // Adiciona dados para o movimento
    chicken.userData.wanderTarget = null;
    chicken.userData.lastMoveTime = 0;
    
    // A altura do corpo principal é 2. A base do modelo deve estar em y=0.
    const yOffset = 1;
    
    // Corpo (cubo principal)
    const bodyGeometry = new THREE.BoxGeometry(3, 2.5, 2);
    const body = new THREE.Mesh(bodyGeometry, whiteMaterial);
    body.position.y = 0 + yOffset;
    body.castShadow = true;
    chicken.add(body);

    // Cabeça (cubo menor)
    const headGeometry = new THREE.BoxGeometry(2, 2, 1.5);
    const head = new THREE.Mesh(headGeometry, whiteMaterial);
    head.position.set(0, 2.5 + yOffset, 0);
    head.castShadow = true;
    chicken.add(head);

    // Crista (cubos pequenos em cima da cabeça)
    for (let i = 0; i < 3; i++) {
        const crestGeometry = new THREE.BoxGeometry(0.4, 0.8, 0.3);
        const crest = new THREE.Mesh(crestGeometry, redMaterial);
        crest.position.set(-0.4 + i * 0.4, 3.5 + yOffset, 0);
        crest.castShadow = true;
        chicken.add(crest);
    }

    // Bico (cubo pequeno)
    const beakGeometry = new THREE.BoxGeometry(0.8, 0.3, 0.3);
    const beak = new THREE.Mesh(beakGeometry, orangeMaterial);
    beak.position.set(0, 2.3 + yOffset, 1);
    beak.castShadow = true;
    chicken.add(beak);

    // Olhos (cubos pequenos pretos)
    const eyeGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.1);
    const leftEye = new THREE.Mesh(eyeGeometry, blackMaterial);
    leftEye.position.set(-0.4, 2.7 + yOffset, 0.8);
    chicken.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, blackMaterial);
    rightEye.position.set(0.4, 2.7 + yOffset, 0.8);
    chicken.add(rightEye);

    // Asas (cubos achatados)
    const wingGeometry = new THREE.BoxGeometry(0.5, 1.5, 1.8);
    const leftWing = new THREE.Mesh(wingGeometry, whiteMaterial);
    leftWing.position.set(-1.5, 0.2 + yOffset, 0);
    leftWing.castShadow = true;
    chicken.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeometry, whiteMaterial);
    rightWing.position.set(1.5, 0.2 + yOffset, 0);
    rightWing.castShadow = true;
    chicken.add(rightWing);

    // Pernas (cubos longos)
    const legGeometry = new THREE.BoxGeometry(0.3, 1.5, 0.3);
    const leftLeg = new THREE.Mesh(legGeometry, orangeMaterial);
    leftLeg.position.set(-0.7, -2 + yOffset, 0);
    leftLeg.castShadow = true;
    chicken.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, orangeMaterial);
    rightLeg.position.set(0.7, -2 + yOffset, 0);
    rightLeg.castShadow = true;
    chicken.add(rightLeg);

    // Pés (cubos achatados)
    const footGeometry = new THREE.BoxGeometry(0.8, 0.2, 1);
    const leftFoot = new THREE.Mesh(footGeometry, orangeMaterial);
    leftFoot.position.set(-0.7, -2.8 + yOffset, 0.2);
    leftFoot.castShadow = true;
    chicken.add(leftFoot);

    const rightFoot = new THREE.Mesh(footGeometry, orangeMaterial);
    rightFoot.position.set(0.7, -2.8 + yOffset, 0.2);
    rightFoot.castShadow = true;
    chicken.add(rightFoot);

    // Cauda (cubos empilhados)
    for (let i = 0; i < 2; i++) {
        const tailGeometry = new THREE.BoxGeometry(0.4, 1.2, 0.3);
        const tail = new THREE.Mesh(tailGeometry, whiteMaterial);
        tail.position.set(-1.8 - i * 0.3, 0.5 + i * 0.2 + yOffset, 0);
        tail.rotation.z = Math.PI / 6;
        tail.castShadow = true;
        chicken.add(tail);
    }
    
    // Salva as referências para as animações
    chicken.userData.leftWing = leftWing;
    chicken.userData.rightWing = rightWing;
    chicken.userData.leftLeg = leftLeg;
    chicken.userData.rightLeg = rightLeg;
    
    // Altura da galinha ajustada para y=0
    chicken.position.y = 1.2 * scale;

    return chicken;
}

function spawnChickens() {
    const numChickens = 10;
    const worldRadius = worldSize * 0.85;

    for (let i = 0; i < numChickens; i++) {
        const chicken = createChicken();

        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * worldRadius;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        
        if (Math.sqrt(x*x + z*z) < 8) {
            i--;
            continue;
        }

        chicken.position.set(x, 0, z);

        const scale = 0.5 + Math.random() * 0.3;
        chicken.scale.set(scale, scale, scale);
        chicken.rotation.y = Math.random() * Math.PI * 2;

        scene.add(chicken);
        chickens.push(chicken);
    }
}

// NOVO: Função para atualizar a lógica e animação das galinhas
function updateChickens() {
    chickens.forEach(chicken => {
        const dt = 1/60; // Delta time para movimento consistente

        // Lógica de "andar" aleatoriamente
        const wanderTarget = chicken.userData.wanderTarget;
        const distanceToTarget = wanderTarget ? chicken.position.distanceTo(wanderTarget) : Infinity;

        // Se a galinha não tem um alvo ou está perto demais do alvo
        if (!wanderTarget || distanceToTarget < 1 || (Date.now() - chicken.userData.lastMoveTime) > CHICKEN_WANDER_COOLDOWN) {
            // Escolhe um novo ponto aleatório
            const newTargetX = chicken.position.x + (Math.random() - 0.5) * CHICKEN_WANDER_RADIUS;
            const newTargetZ = chicken.position.z + (Math.random() - 0.5) * CHICKEN_WANDER_RADIUS;
            
            // Limita o novo ponto dentro do mapa
            const boundary = worldSize - 2;
            const newTarget = new THREE.Vector3(
                Math.max(-boundary, Math.min(boundary, newTargetX)),
                0,
                Math.max(-boundary, Math.min(boundary, newTargetZ))
            );

            chicken.userData.wanderTarget = newTarget;
            chicken.userData.lastMoveTime = Date.now();
        }

        // Move e gira a galinha em direção ao alvo
        const direction = new THREE.Vector3().subVectors(chicken.userData.wanderTarget, chicken.position);
        
        if (direction.length() > 0) {
            direction.normalize();

            // Rotação suave
            const targetRotation = Math.atan2(direction.x, direction.z);
            chicken.rotation.y += (targetRotation - chicken.rotation.y) * CHICKEN_TURN_SPEED;
            
            // Move para frente
            chicken.position.add(direction.multiplyScalar(CHICKEN_SPEED * dt * 100));
        }

        // Animação de caminhar (pernas e asas)
        const walkCycle = Math.sin(Date.now() * 0.02) * Math.PI / 8;
        chicken.userData.leftLeg.rotation.x = -walkCycle;
        chicken.userData.rightLeg.rotation.x = walkCycle;
        chicken.userData.leftWing.rotation.z = Math.sin(Date.now() * 0.02) * 0.2;
        chicken.userData.rightWing.rotation.z = -Math.sin(Date.now() * 0.02) * 0.2;

    });
}


// Inicializar o jogo
init();

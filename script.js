let scene, camera, renderer, player, leftArmGroup, rightArmGroup;
let ambientLight, directionalLight;
let isDragging = false;
let previousMousePosition = { x: 0 };
let isAnimating = false;

// NOVO: Variáveis para o ciclo de dia e noite
let cycleTime = 0;
const DAY_CYCLE_DURATION = 150000; // 15 segundos para um ciclo completo

// Cores e posições para as transições
const sceneColors = {
    morning: {
        sky: ['#87CEEB', '#B0E0E6', '#E0F6FF'],
        hill: 'radial-gradient(ellipse at center bottom, #4CAF50 0%, #66BB6A 30%, #81C784 60%, #A5D6A7 100%)',
        grass: 'linear-gradient(to top, #2E7D32, #4CAF50, #66BB6A)',
        sunOpacity: 1, moonOpacity: 0, cloudOpacity: 0.8, butterflyOpacity: 1, flowerOpacity: 1,
        lightIntensity: { ambient: 0.8, directional: 0.6 }
    },
    dusk: {
        sky: ['#ADD8E6', '#F0E68C', '#FFA07A'],
        hill: 'radial-gradient(ellipse at center bottom, #4CAF50 0%, #66BB6A 30%, #81C784 60%, #A5D6A7 100%)',
        grass: 'linear-gradient(to top, #2E7D32, #4CAF50, #66BB6A)',
        sunOpacity: 1, moonOpacity: 0, cloudOpacity: 0.8, butterflyOpacity: 1, flowerOpacity: 1,
        lightIntensity: { ambient: 0.7, directional: 0.5 }
    },
    night: {
        sky: ['#000033', '#000044', '#191970'],
        hill: 'radial-gradient(ellipse at center bottom, #2C4B30 0%, #3F6042 30%, #517154 60%, #688C6B 100%)',
        grass: 'linear-gradient(to top, #1A4D1E, #2B6D2F, #3D8C42)',
        sunOpacity: 0, moonOpacity: 1, cloudOpacity: 0.2, butterflyOpacity: 0, flowerOpacity: 0.5,
        lightIntensity: { ambient: 0.2, directional: 0.1 }
    }
};

// Função para interpolar entre duas cores em formato hex
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
    } : null;
}

// Função para atualizar a cena com base no progresso do ciclo
function updateScene(progress) {
    const skyElement = document.querySelector('.sky');
    const hillElement = document.querySelector('.hill');
    const sunElement = document.querySelector('.sun');
    const moonElement = document.querySelector('.moon');
    const clouds = document.querySelectorAll('.cloud');
    const butterflies = document.querySelectorAll('.butterfly');
    const flowers = document.querySelectorAll('.flower');
    const grass = document.querySelectorAll('.grass');

    let currentState, nextState, transitionProgress;

    if (progress <= 0.25) { // Manhã para Tarde
        currentState = sceneColors.morning;
        nextState = sceneColors.dusk;
        transitionProgress = progress / 0.25;
    } else if (progress <= 0.5) { // Tarde para Noite
        currentState = sceneColors.dusk;
        nextState = sceneColors.night;
        transitionProgress = (progress - 0.25) / 0.25;
    } else if (progress <= 0.75) { // Noite para Madrugada
        currentState = sceneColors.night;
        nextState = sceneColors.morning;
        transitionProgress = (progress - 0.5) / 0.25;
    } else { // Madrugada para Manhã
        currentState = sceneColors.morning;
        nextState = sceneColors.morning;
        transitionProgress = (progress - 0.75) / 0.25;
    }

    // Transição do céu
    const startSky = currentState.sky;
    const endSky = nextState.sky;
    const lerpedSky = startSky.map((startColor, i) => {
        const startRGB = hexToRgb(startColor);
        const endRGB = hexToRgb(endSky[i]);
        const r = startRGB.r + (endRGB.r - startRGB.r) * transitionProgress;
        const g = startRGB.g + (endRGB.g - startRGB.g) * transitionProgress;
        const b = startRGB.b + (endRGB.b - startRGB.b) * transitionProgress;
        return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
    });
    skyElement.style.background = `linear-gradient(to bottom, ${lerpedSky[0]}, ${lerpedSky[1]} 50%, ${lerpedSky[2]} 100%)`;

    // Transição da colina e grama (cores CSS)
    if (hillElement.style.background !== nextState.hill) {
        hillElement.style.background = nextState.hill;
    }
    grass.forEach(g => g.style.background = nextState.grass);

    // Transição da luz e elementos 2D
    sunElement.style.opacity = currentState.sunOpacity + (nextState.sunOpacity - currentState.sunOpacity) * transitionProgress;
    moonElement.style.opacity = currentState.moonOpacity + (nextState.moonOpacity - currentState.moonOpacity) * transitionProgress;
    clouds.forEach(c => c.style.opacity = currentState.cloudOpacity + (nextState.cloudOpacity - currentState.cloudOpacity) * transitionProgress);
    butterflies.forEach(b => b.style.opacity = currentState.butterflyOpacity + (nextState.butterflyOpacity - currentState.butterflyOpacity) * transitionProgress);
    flowers.forEach(f => f.style.opacity = currentState.flowerOpacity + (nextState.flowerOpacity - currentState.flowerOpacity) * transitionProgress);

    // Transição das luzes 3D
    ambientLight.intensity = currentState.lightIntensity.ambient + (nextState.lightIntensity.ambient - currentState.lightIntensity.ambient) * transitionProgress;
    directionalLight.intensity = currentState.lightIntensity.directional + (nextState.lightIntensity.directional - currentState.lightIntensity.directional) * transitionProgress;
}

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 8); // Ajuste do Z para uma visão mais ampla
    camera.lookAt(0, 1.2, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('gameContainer').appendChild(renderer.domElement);

    // As luzes agora são variáveis globais para serem manipuladas pela transição
    ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    
    directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    scene.add(directionalLight);

    const groundGeometry = new THREE.PlaneGeometry(20, 20);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0xcccccc, transparent: true, opacity: 0 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    createRobloxCharacter();
    
    createImprovedDryTree(new THREE.Vector3(-6, 0, -6), 0.7); 
    createImprovedDryTree(new THREE.Vector3(8, 0, -8), 0.9);  
    
    document.getElementById('startButton').addEventListener('click', handleClick);
    
    const gameContainer = document.getElementById('gameContainer');
    gameContainer.addEventListener('mousedown', onMouseDown);
    gameContainer.addEventListener('mousemove', onMouseMove);
    gameContainer.addEventListener('mouseup', onMouseUp);
    gameContainer.addEventListener('mouseleave', onMouseUp);

    gameContainer.addEventListener('touchstart', onTouchStart, { passive: false });
    gameContainer.addEventListener('touchmove', onTouchMove, { passive: false });
    gameContainer.addEventListener('touchend', onTouchEnd);

    window.addEventListener('resize', onWindowResize);

    // Iniciar a animação periódica e o loop de animação principal
    setInterval(animateCharacter, 10000);
    animate();
}

// NOVO: Função para solicitar tela cheia de forma robusta
function requestFullscreen(element) {
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
    }
}

// NOVO: Ação do botão "Iniciar" agora também ativa a tela cheia
function handleClick() {
    const gameWrapper = document.getElementById('game-wrapper');
    requestFullscreen(gameWrapper); // Tenta colocar o contêiner do jogo em tela cheia
    window.location.href = 'car.html';
}

function createRobloxCharacter() {
    player = new THREE.Group();
    player.position.set(0, 1.5, 0); 
    scene.add(player);

    const skinMaterial = new THREE.MeshLambertMaterial({ color: 0xF1C27D });
    const shirtMaterial = new THREE.MeshLambertMaterial({ color: 0x4444aa });
    const pantsMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const hairMaterial = new THREE.MeshLambertMaterial({ color: 0x2B1B0E });
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
    const mouthMaterial = new THREE.MeshLambertMaterial({ color: 0xAA0000 });

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), skinMaterial);
    head.position.set(0, 1.7, 0);
    head.castShadow = true;
    player.add(head);

    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.3, 0.65), hairMaterial);
    hair.position.set(0, 1.99, 0);
    hair.castShadow = true;
    player.add(hair);

    const eyeGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.02);
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.15, 1.71, 0.31);
    player.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.15, 1.71, 0.31);
    player.add(rightEye);

    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.02), mouthMaterial);
    mouth.position.set(0, 1.5, 0.31);
    player.add(mouth);

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.4), shirtMaterial);
    body.position.set(0, 0.8, 0);
    body.castShadow = true;
    player.add(body);

    const armGeometry = new THREE.BoxGeometry(0.25, 1.0, 0.25);
    const armMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });

    leftArmGroup = new THREE.Group();
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.y = -0.5;
    leftArm.castShadow = true;
    leftArmGroup.add(leftArm);
    leftArmGroup.position.set(-0.625, 1.5, 0);
    player.add(leftArmGroup);

    rightArmGroup = new THREE.Group();
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.y = -0.5;
    rightArm.castShadow = true;
    rightArmGroup.add(rightArm);
    rightArmGroup.position.set(0.625, 1.5, 0);
    player.add(rightArmGroup);

    const legGeometry = new THREE.BoxGeometry(0.35, 1.2, 0.35);

    const leftLegGroup = new THREE.Group();
    const leftLeg = new THREE.Mesh(legGeometry, pantsMaterial);
    leftLeg.position.y = -0.6;
    leftLeg.castShadow = true;
    leftLegGroup.add(leftLeg);
    leftLegGroup.position.set(-0.25, 0.2, 0);
    player.add(leftLegGroup);

    const rightLegGroup = new THREE.Group();
    const rightLeg = new THREE.Mesh(legGeometry, pantsMaterial);
    rightLeg.position.y = -0.6;
    rightLeg.castShadow = true;
    rightLegGroup.add(rightLeg);
    rightLegGroup.position.set(0.25, 0.2, 0);
    player.add(rightLegGroup);
}

function createImprovedDryTree(position, scale = 1) {
    const tree = new THREE.Group();
    tree.position.copy(position);
    tree.scale.set(scale, scale, scale);
    
    const trunkMaterial = new THREE.MeshLambertMaterial({ color: 0x654321, roughness: 0.8 });
    const oldBranchMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513, roughness: 0.9 });
    const dryBranchMaterial = new THREE.MeshLambertMaterial({ color: 0xA0522D, roughness: 1.0 });
    const deadBranchMaterial = new THREE.MeshLambertMaterial({ color: 0x696969, roughness: 1.0 });
    
    const trunkGeometry = new THREE.CylinderGeometry(0.08, 0.35, 4, 12);
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);

    const upperTrunkGeometry = new THREE.CylinderGeometry(0.04, 0.08, 1.5, 8);
    const upperTrunk = new THREE.Mesh(upperTrunkGeometry, oldBranchMaterial);
    upperTrunk.position.y = 4.75;
    upperTrunk.castShadow = true;
    upperTrunk.receiveShadow = true;
    tree.add(upperTrunk);

    function createRealisticBranch(startX, startY, startZ, endX, endY, endZ, thickness, material, generation = 0) {
        const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2) + Math.pow(endZ - startZ, 2));
        const geometry = new THREE.CylinderGeometry(thickness * 0.3, thickness, length, Math.max(6, 12 - generation * 2));
        const branch = new THREE.Mesh(geometry, material);
        
        branch.position.set((startX + endX) / 2, (startY + endY) / 2, (startZ + endZ) / 2);
        
        const direction = new THREE.Vector3(endX - startX, endY - startY, endZ - startZ);
        direction.normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
        branch.setRotationFromQuaternion(quaternion);
        
        branch.castShadow = true;
        branch.receiveShadow = true;
        tree.add(branch);

        if (generation < 4 && length > 0.3) {
            const subBranchCount = Math.max(1, Math.floor((5 - generation) * Math.random() + 1));
            
            for (let i = 0; i < subBranchCount; i++) {
                const t = 0.6 + Math.random() * 0.3;
                const subStartX = startX + (endX - startX) * t;
                const subStartY = startY + (endY - startY) * t;
                const subStartZ = startZ + (endZ - startZ) * t;
                
                const angle = Math.random() * Math.PI * 2;
                const deviation = Math.PI / 6 + Math.random() * Math.PI / 4;
                const subLength = length * (0.4 + Math.random() * 0.4);
                
                const subEndX = subStartX + Math.cos(angle) * Math.sin(deviation) * subLength;
                const subEndY = subStartY + Math.cos(deviation) * subLength;
                const subEndZ = subStartZ + Math.sin(angle) * Math.sin(deviation) * subLength;
                
                const subThickness = thickness * (0.5 + Math.random() * 0.3);
                const subMaterial = generation > 2 ? deadBranchMaterial : generation > 1 ? dryBranchMaterial : oldBranchMaterial;
                
                createRealisticBranch(
                    subStartX, subStartY, subStartZ,
                    subEndX, subEndY, subEndZ,
                    subThickness, subMaterial, generation + 1
                );
            }
        }
    }

    const mainBranches = [
        { start: [-0.2, 2.5, 0], end: [-2.5, 4.8, -0.8], thickness: 0.15 },
        { start: [0.3, 2.8, 0], end: [3.2, 5.2, 1.2], thickness: 0.18 },
        { start: [0.1, 3.2, -0.2], end: [0.8, 6.5, -2.8], thickness: 0.12 },
        { start: [-0.1, 3.5, 0.3], end: [-1.8, 6.8, 2.2], thickness: 0.14 },
        { start: [0.2, 3.8, 0], end: [2.8, 7.2, -0.5], thickness: 0.11 },
        { start: [-0.3, 4.1, 0], end: [-2.2, 7.5, 1.8], thickness: 0.10 },
        { start: [0, 4.5, 0.2], end: [1.5, 8.2, 2.5], thickness: 0.09 },
        { start: [0.1, 4.8, -0.1], end: [-1.2, 8.8, -2.0], thickness: 0.08 }
    ];

    mainBranches.forEach(branch => {
        createRealisticBranch(
            branch.start[0], branch.start[1], branch.start[2],
            branch.end[0], branch.end[1], branch.end[2],
            branch.thickness, oldBranchMaterial, 0
        );
    });

    for (let i = 0; i < 8; i++) {
        const height = 2 + Math.random() * 3;
        const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
        const radius = 0.15 + Math.random() * 0.2;
        const startX = Math.cos(angle) * radius;
        const startZ = Math.sin(angle) * radius;
        
        const endX = startX + (Math.random() - 0.5) * 0.8;
        const endY = height + Math.random() * 0.6;
        const endZ = startZ + (Math.random() - 0.5) * 0.8;
        
        const stumpGeometry = new THREE.CylinderGeometry(0.02, 0.06, 0.3, 6);
        const stump = new THREE.Mesh(stumpGeometry, deadBranchMaterial);
        stump.position.set(startX, height, startZ);
        stump.rotation.set((Math.random() - 0.5) * Math.PI / 3, angle, (Math.random() - 0.5) * Math.PI / 6);
        stump.castShadow = true;
        tree.add(stump);
    }

    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6;
        const rootLength = 0.8 + Math.random() * 0.6;
        const rootGeometry = new THREE.CylinderGeometry(0.02, 0.08, rootLength, 6);
        const root = new THREE.Mesh(rootGeometry, trunkMaterial);
        
        root.position.set(Math.cos(angle) * 0.3, rootLength * 0.3, Math.sin(angle) * 0.3);
        root.rotation.set(Math.PI / 3 + Math.random() * Math.PI / 6, angle, (Math.random() - 0.5) * Math.PI / 8);
        root.castShadow = true;
        tree.add(root);
    }
    
    scene.add(tree);
}

function onMouseDown(event) {
    isDragging = true;
    previousMousePosition.x = event.clientX;
}

function onMouseMove(event) {
    if (!isDragging) return;
    const deltaX = event.clientX - previousMousePosition.x;
    player.rotation.y += deltaX * 0.01;
    previousMousePosition.x = event.clientX;
}

function onMouseUp() {
    isDragging = false;
}

function onTouchStart(event) {
    if (event.touches.length === 1) {
        isDragging = true;
        previousMousePosition.x = event.touches[0].clientX;
    }
}

function onTouchMove(event) {
    if (!isDragging || event.touches.length !== 1) return;
    const deltaX = event.touches[0].clientX - previousMousePosition.x;
    player.rotation.y += deltaX * 0.01;
    previousMousePosition.x = event.touches[0].clientX;
}

function onTouchEnd() {
    isDragging = false;
}

function animate(time) {
    requestAnimationFrame(animate);

    // Atualiza o tempo do ciclo
    cycleTime += 16.67; // Aproximadamente 60 fps
    if (cycleTime > DAY_CYCLE_DURATION) {
        cycleTime = 0;
    }
    
    const progress = cycleTime / DAY_CYCLE_DURATION;
    updateScene(progress);

    // Animação do personagem (respiração/ocioso)
    const breathScale = 1 + Math.sin(time / 1000) * 0.02;
    player.scale.y = breathScale;
    player.position.y = 1.5 + Math.sin(time / 1000) * 0.025;
    leftArmGroup.rotation.x = Math.sin(time / 1000) * 0.1;
    rightArmGroup.rotation.x = Math.sin(time / 1000) * -0.1;

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animateCharacter() {
    if (isAnimating) return;
    isAnimating = true;

    const animationDuration = 1000;
    const start = Date.now();
    const originalY = player.position.y;
    const originalScaleY = player.scale.y;

    function updateAnimation() {
        const elapsed = Date.now() - start;
        const progress = elapsed / animationDuration;

        if (progress < 1) {
            const breathScale = 1 + Math.sin(progress * Math.PI) * 0.02;
            const breathY = Math.sin(progress * Math.PI) * 0.05;

            player.scale.y = originalScaleY * breathScale;
            player.position.y = originalY + breathY;

            const armAngle = Math.sin(progress * Math.PI) * Math.PI / 10;
            leftArmGroup.rotation.x = -armAngle;
            rightArmGroup.rotation.x = armAngle;

            requestAnimationFrame(updateAnimation);
        } else {
            player.scale.y = originalScaleY;
            player.position.y = originalY;
            leftArmGroup.rotation.x = 0;
            rightArmGroup.rotation.x = 0;
            isAnimating = false;
        }
    }
    updateAnimation();
}

function createGrassAndFlowers() {
    const grassField = document.getElementById('grassField');
    grassField.innerHTML = ''; // Limpa antes de recriar
    
    const grassCount = Math.floor(window.innerWidth / 8); 
    
    for (let i = 0; i < grassCount; i++) {
        const grass = document.createElement('div');
        grass.className = 'grass';
        grass.style.left = Math.random() * 100 + '%';
        grass.style.height = (20 + Math.random() * 40) + 'px';
        grass.style.animationDelay = Math.random() * 3 + 's';
        grass.style.animationDuration = (2 + Math.random() * 2) + 's';
        grassField.appendChild(grass);
    }
    
    const flowerCount = Math.floor(window.innerWidth / 100);
    const colors = ['', 'yellow', 'purple', 'white'];
    
    for (let i = 0; i < flowerCount; i++) {
        const flower = document.createElement('div');
        flower.className = 'flower ' + colors[Math.floor(Math.random() * colors.length)];
        flower.style.left = Math.random() * 100 + '%';
        flower.style.animationDelay = Math.random() * 4 + 's';
        flower.style.animationDuration = (3 + Math.random() * 2) + 's';
        
        flower.innerHTML = `
            <div class="flower-petals">
                <div class="flower-center"></div>
            </div>
            <div class="flower-stem"></div>
        `;
        
        grassField.appendChild(flower);
    }
}

window.addEventListener('load', function() {
    init();
    createGrassAndFlowers();
    onWindowResize();
});

window.addEventListener('resize', function() {
    const grassField = document.getElementById('grassField');
    grassField.innerHTML = '';
    createGrassAndFlowers();
    onWindowResize();
});

document.addEventListener('gesturestart', function (e) {
    e.preventDefault();
});

document.addEventListener('wheel', function (e) {
    if (e.ctrlKey) {
        e.preventDefault();
    }
}, { passive: false });

// ============================
// Controle do botão voltar SOMENTE no lobby
// ============================
if (location.pathname.endsWith("index.html") || location.pathname === "/") {
    let lastBackPress = 0;

    // Substitui o histórico anterior (limpa car.html e game.html)
    history.replaceState(null, null, location.href);

    window.addEventListener("popstate", function () {
        const now = Date.now();

        if (now - lastBackPress < 2000) {
            // Segundo clique → tenta fechar
            if (navigator.app && navigator.app.exitApp) {
                navigator.app.exitApp(); // em WebView / Cordova
            } else if (navigator.device && navigator.device.exitApp) {
                navigator.device.exitApp(); // em alguns wrappers
            } else {
                window.open("", "_self").close(); // fallback
            }
        } else {
            // Primeiro clique → só avisa
            alert("Pressione novamente o botão voltar para sair do jogo.");
        }

        lastBackPress = now;
        // Empurra de volta o estado para continuar no lobby
        history.pushState(null, null, location.href);
    });

    // Inicialmente empurra o estado para travar o histórico
    history.pushState(null, null, location.href);
}

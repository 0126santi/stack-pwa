let scene, camera, renderer;
let stack = [];
let currentBlock;
let score = 0;
let axis = 'x';
const boxHeight = 0.5;
let gameOver = false;
let scoreLabel;
let highscore = 0;
let highscoreName = '';
let newRecordShown = false;
let newHighscoreValue = 0;
let colorHue = 0;
let lastTime = performance.now();
let blockSpeed = 10; // velocidad inicial




const highscoreDisplay = document.getElementById("highscoreDisplay");
const newRecordMsg = document.getElementById("newRecordMsg");
const gameOverEl = document.getElementById("gameover");
const finalScoreEl = document.getElementById("finalScore");
const restartBtn = document.getElementById("restartBtn");
const playerNameInput = document.getElementById('playerNameInput');
const submitNameBtn = document.getElementById('submitNameBtn');
const placeSound = new Audio('/sounds/click.mp3');


function isMobile() {
  return /Mobi|Android/i.test(navigator.userAgent);
}

init();
animate();

function init() {
  scene = new THREE.Scene();
  const aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
  if (isMobile()) {
    camera.position.set(10, 20, 10);  // Mas lejos en moviles
  } else {
    camera.position.set(6, 12, 6);
  }
  
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(10, 20, 10);
  scene.add(ambient, dirLight);

  initScene();

  fetch('/highscore')
    .then(res => res.json())
    .then(data => {
      highscore = data.highscore;
      highscoreName = data.name || '';
      highscoreDisplay.innerText = `Record: ${highscore} (${highscoreName})`;
    });

  submitNameBtn.addEventListener('click', () => {
    let playerName = playerNameInput.value.trim();

    if (playerName.length > 10) {
      playerName = playerName.slice(0, 10);
    }

    if (playerName) {
      fetch('/highscore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ highscore: score, name: playerName })
      });

      // Actualizar la UI
      highscoreDisplay.innerText = `Record: ${highscore} (${playerName})`;

      submitNameBtn.style.display = 'none';
      playerNameInput.style.display = 'none';
    }
  });    
}

function initScene() {
  blockSpeed = 10;
  stack = [];
  score = 0;
  axis = 'x';
  gameOver = false;
  currentBlock = null;
  gameOverEl.style.display = "none";
  playerNameInput.style.display = 'none';
  submitNameBtn.style.display = 'none';

  while (scene.children.length > 0) {
    scene.remove(scene.children[0]);
  }

  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(10, 20, 10);
  scene.add(ambient, dirLight);

  addBlock(0, -boxHeight, 5, 5, 0x333333, true);
  addBlock(0, 0, 3, 3);
  addMovingBlock();

  if (isMobile()) {
    camera.position.set(10, 20, 10);
  } else {
    camera.position.set(6, 12, 6);
  }
  
  camera.lookAt(0, 0, 0);

  addScoreLabel();
  newRecordMsg.style.display = 'none';
  newRecordShown = false;
}

function addBlock(x, y, width, depth, color = 0x410445, isBase = false) {
  const geometry = new THREE.BoxGeometry(width, boxHeight, depth);
  const material = new THREE.MeshPhongMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, 0);
  scene.add(mesh);
  if (!isBase) {
    stack.push({ mesh, width, depth });
  }
}

function addMovingBlock() {
  const last = stack[stack.length - 1];
  const y = stack.length * boxHeight;
  const width = last.width;
  const depth = last.depth;

  colorHue = (colorHue + 10) % 360;
  const color = new THREE.Color(`hsl(${colorHue}, 100%, 60%)`);

  const geometry = new THREE.BoxGeometry(width, boxHeight, depth);
  const material = new THREE.MeshPhongMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(axis === 'x' ? -10 : last.mesh.position.x, y, axis === 'z' ? -10 : last.mesh.position.z);
  scene.add(mesh);

  currentBlock = { mesh, width, depth, direction: 1 };
}


function splitBlock() {
  const prev = stack[stack.length - 1];
  const curr = currentBlock;
  const axisPos = axis === 'x' ? 'x' : 'z';
  const delta = curr.mesh.position[axisPos] - prev.mesh.position[axisPos];
  const overlap = (axis === 'x' ? curr.width : curr.depth) - Math.abs(delta);

  if (overlap <= 0) {
    endGame();
    return false;
  }

  const y = curr.mesh.position.y;
  const retainedSize = overlap;
  const retainedCenter = prev.mesh.position[axisPos] + delta / 2;

  const newGeometry = new THREE.BoxGeometry(
    axis === 'x' ? retainedSize : curr.width,
    boxHeight,
    axis === 'z' ? retainedSize : curr.depth
  );
  const newBlock = new THREE.Mesh(newGeometry, curr.mesh.material);
  newBlock.position.set(
    axis === 'x' ? retainedCenter : curr.mesh.position.x,
    y,
    axis === 'z' ? retainedCenter : curr.mesh.position.z
  );
  scene.add(newBlock);
  stack.push({
    mesh: newBlock,
    width: axis === 'x' ? retainedSize : curr.width,
    depth: axis === 'z' ? retainedSize : curr.depth
  });

  scene.remove(currentBlock.mesh);

  score++;
updateScoreLabel(score);

placeSound.currentTime = 0; // Reinicia el audio si ya estaba sonando
placeSound.play();

// Aumentar velocidad cada 20 bloques
if (score % 20 === 0) {
  blockSpeed += 1; // ajustar incremento 
}


  axis = axis === 'x' ? 'z' : 'x';
  addMovingBlock();
  return true;
}


function animate() {
  requestAnimationFrame(animate);

  const currentTime = performance.now();
  const delta = (currentTime - lastTime) / 1000; // en segundos
  lastTime = currentTime;

  if (!gameOver && currentBlock) {
    const pos = currentBlock.mesh.position;
    const speed = blockSpeed;// bloques por segundo

    if (axis === 'x') {
      pos.x += speed * delta * currentBlock.direction;
      if (pos.x > 10 || pos.x < -10) currentBlock.direction *= -1;
    } else {
      pos.z += speed * delta * currentBlock.direction;
      if (pos.z > 10 || pos.z < -10) currentBlock.direction *= -1;
    }
  }

  const offsetY = isMobile() ? 6 : 4;
  const targetY = (stack.length - 2) * boxHeight + offsetY;
  camera.position.y += (targetY - camera.position.y) * 0.05;
  camera.lookAt(0, camera.position.y - 3, 0);

  if (scoreLabel) {
    scoreLabel.position.set(0, stack.length * boxHeight + 2, 0);
  }

  renderer.render(scene, camera);
}


function endGame() {
  gameOver = true;
  finalScoreEl.innerText = "Final score: " + score;
  gameOverEl.style.display = "flex";
}

window.addEventListener("click", () => {
  if (gameOver || !currentBlock) return;
  splitBlock();
});

restartBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  initScene();
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function addScoreLabel() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.font = 'bold 60px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(score, 128, 90);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  scoreLabel = new THREE.Sprite(material);
  scoreLabel.scale.set(4, 2, 1);
  scoreLabel.position.set(0, boxHeight * stack.length + 1, 0);
  scene.add(scoreLabel);
}

function updateScoreLabel(value) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.font = 'bold 60px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(value, 128, 90);

  scoreLabel.material.map.dispose();
  scoreLabel.material.map = new THREE.CanvasTexture(canvas);

  // Verifica si el puntaje ha superado el record actual
  if (value > highscore) {
    highscore = value; // <-- ACTUALIZA SIEMPRE

    highscoreDisplay.innerText = `Record: ${highscore}  `;

    if (!newRecordShown) {
      newRecordMsg.style.display = 'block';
      newRecordShown = true;
      newHighscoreValue = value;

      // Mostrar campos para guardar nombre
      playerNameInput.style.display = 'block';
      submitNameBtn.style.display = 'block';
    }
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('✅ Service Worker registrado:', reg.scope))
      .catch(err => console.error('❌ Error registrando el SW:', err));
  });
}

const express = require('express');
const fs = require('fs');
const app = express();
const PORT = 3000;

let highscore = 0;
let playerName = '';
const FILE_PATH = 'highscore.json';

// Leer el record actual si existe
if (fs.existsSync(FILE_PATH)) {
  const data = JSON.parse(fs.readFileSync(FILE_PATH));
  highscore = data.highscore || 0;
  playerName = data.name || '';
}

app.use(express.static(__dirname));
app.use(express.json());

// Ruta GET para obtener el récord actual
app.get('/highscore', (req, res) => {
  res.json({ highscore, name: playerName });
});

// Ruta POST para guardar un nuevo récord
app.post('/highscore', (req, res) => {
  const { highscore: newScore, name } = req.body;
  if (newScore > highscore) {
    highscore = newScore;
    playerName = name || 'Anonymous';
    fs.writeFileSync(FILE_PATH, JSON.stringify({ highscore, name: playerName }));
  }
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});


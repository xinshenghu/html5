// game.js - 拼图 + 贪吃蛇 + 扫雷
const sysInfo = wx.getSystemInfoSync()
const SCREEN_W = sysInfo.windowWidth
const SCREEN_H = sysInfo.screenHeight

let canvas, ctx
let currentScene = 'menu'
let scenes = {}
let snTouchStartX = 0, snTouchStartY = 0
let snFingerX = null, snFingerY = null

// ========== 拼图常量 ==========
const PUZ_COLS = 3, PUZ_ROWS = 3
const PUZ_PIECE_W = Math.floor(SCREEN_W * 0.85 / PUZ_COLS)
const PUZ_PIECE_H = Math.floor(PUZ_PIECE_W * 172 / 167)
const PUZ_GRID_W = PUZ_PIECE_W * PUZ_COLS
const PUZ_GRID_H = PUZ_PIECE_H * PUZ_ROWS
const PUZ_GRID_X = Math.floor((SCREEN_W - PUZ_GRID_W) / 2)
const PUZ_GRID_Y = Math.floor((SCREEN_H - PUZ_GRID_H) / 2)

// ========== 贪吃蛇常量 ==========
const SN_COLS = 16, SN_ROWS = 16
const SN_CELL = Math.floor(SCREEN_W * 0.85 / SN_COLS)
const SN_W = SN_CELL * SN_COLS
const SN_H = SN_CELL * SN_ROWS
const SN_X = Math.floor((SCREEN_W - SN_W) / 2)
const SN_Y = SCREEN_H * 0.14

// ========== 扫雷常量 ==========
const MINE_COLS = 5, MINE_ROWS = 5
const MINE_CELL = Math.floor(SCREEN_W * 0.75 / MINE_COLS)
const MINE_W = MINE_CELL * MINE_COLS
const MINE_H = MINE_CELL * MINE_ROWS
const MINE_X = Math.floor((SCREEN_W - MINE_W) / 2)
const MINE_Y = SCREEN_H * 0.14
const MINE_COUNT = 6

// ========== 消消乐常量 ==========
const M3_COLS = 8, M3_ROWS = 8
const M3_CELL = Math.floor(SCREEN_W * 0.8 / M3_COLS)
const M3_W = M3_CELL * M3_COLS
const M3_H = M3_CELL * M3_ROWS
const M3_X = Math.floor((SCREEN_W - M3_W) / 2)
const M3_Y = SCREEN_H * 0.14
const M3_TARGET = 200
const M3_COLORS = ['#e53935', '#43a047', '#1e88e5', '#fdd835', '#8e24aa', '#ff6f00']
const M3_EMOJI = ['', '', '', '', '', '']


// ========== 数独常量 ==========
const SD_CELL = Math.floor(SCREEN_W * 0.82 / 9)
const SD_W = SD_CELL * 9
const SD_H = SD_CELL * 9
const SD_X = Math.floor((SCREEN_W - SD_W) / 2)
const SD_Y = SCREEN_H * 0.11
const NUMPAD_ROWS = 2
const NUMPAD_COLS = 5
const NUMPAD_CELL = Math.floor(SCREEN_W * 0.7 / NUMPAD_COLS)
const NUMPAD_W = NUMPAD_CELL * NUMPAD_COLS
const NUMPAD_X = Math.floor((SCREEN_W - NUMPAD_W) / 2)
const NUMPAD_Y = SCREEN_H - NUMPAD_CELL * NUMPAD_ROWS - 30

// ========== 青蛙过河常量 ==========
const FROG_COUNT = 3  // 每边青蛙数量
const FROG_CELL = Math.floor(SCREEN_W * 0.78 / (FROG_COUNT * 2 + 1))
const FROG_W = FROG_CELL * (FROG_COUNT * 2 + 1)
const FROG_X = Math.floor((SCREEN_W - FROG_W) / 2)
const FROG_Y = SCREEN_H * 0.30
let frogBoard = []       // [0]=左, 1=右, 2=空
let frogSelected = -1    // 选中的格子索引
let frogMoves = 0
let frogOver = false
let frogWon = false
let frogTouchX = 0, frogTouchY = 0

// 全局状态
let images = [], imagesLoaded = 0
let dragging = null

function init() {
  canvas = wx.createCanvas()
  canvas.width = SCREEN_W
  canvas.height = SCREEN_H
  ctx = canvas.getContext('2d')

  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H)
  ctx.fillStyle = '#fff'
  ctx.font = '18px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('加载中...', SCREEN_W / 2, SCREEN_H / 2)

  for (var i = 1; i <= 9; i++) {
    var img = wx.createImage()
    img.onload = function() {
      imagesLoaded++
      if (imagesLoaded >= 9) showMenu()
    }
    img.onerror = function() {
      imagesLoaded++
      if (imagesLoaded >= 9) showMenu()
    }
    img.src = 'images/first/' + i + '.png'
    images[i - 1] = img
  }
}

// ========== 事件分发 ==========
function onGlobalTouchStart(e) {
  var touch = e.changedTouches[0]
  if (currentScene === 'menu') handleMenuTouch(touch)
  else if (currentScene === 'puzzle') handlePuzzleTouchStart(touch)
  else if (currentScene === 'snake') {
    snTouchStartX = touch.clientX
    snTouchStartY = touch.clientY
    snFingerX = touch.clientX
    snFingerY = touch.clientY
  } else if (currentScene === 'match3') {
    m3TouchX = touch.clientX
    m3TouchY = touch.clientY
  } else if (currentScene === 'sudoku') {
    sdTouchX = touch.clientX
    sdTouchY = touch.clientY
  } else if (currentScene === 'frog') {
    frogTouchX = touch.clientX
    frogTouchY = touch.clientY
  }
}

function onGlobalTouchMove(e) {
  if (currentScene === 'puzzle' && dragging) {
    var touch = e.changedTouches[0]
    dragging.dx = touch.clientX - dragging.startTx
    dragging.dy = touch.clientY - dragging.startTy
    drawPuzzle()
  } else if (currentScene === 'snake' && !snOver) {
    var touch = e.changedTouches[0]
    var tx = touch.clientX, ty = touch.clientY
    var sdx = tx - snTouchStartX
    var sdy = ty - snTouchStartY
    snFingerX = tx
    snFingerY = ty
    if (Math.abs(sdx) > Math.abs(sdy)) {
      if (sdx > 5 && snDir.x !== -1) snNextDir = { x: 1, y: 0 }
      else if (sdx < -5 && snDir.x !== 1) snNextDir = { x: -1, y: 0 }
    } else {
      if (sdy > 5 && snDir.y !== -1) snNextDir = { x: 0, y: 1 }
      else if (sdy < -5 && snDir.y !== 1) snNextDir = { x: 0, y: -1 }
    }
    snTouchStartX = tx
    snTouchStartY = ty
  }
}

function onGlobalTouchEnd(e) {
  var touch = e.changedTouches[0]
  if (currentScene === 'puzzle') handlePuzzleTouchEnd(touch)
  else if (currentScene === 'snake') {
    snFingerX = null
    snFingerY = null
    handleSnakeTouchEnd(touch)
  } else if (currentScene === 'mine') handleMineTouchEnd(touch)
  else if (currentScene === 'match3') handleMatch3TouchEnd(touch)
  else if (currentScene === 'sudoku') handleSudokuTouchEnd(touch)
  else if (currentScene === 'frog') handleFrogTouchEnd(touch)
}

function showMenu() {
  currentScene = 'menu'
  if (scenes.snake && scenes.snake.interval) {
    clearInterval(scenes.snake.interval)
    scenes.snake.interval = null
  }
  drawMenu()
}

// ========== 主菜单 ==========
function drawMenu() {
  ctx.clearRect(0, 0, SCREEN_W, SCREEN_H)
  var grad = ctx.createLinearGradient(0, 0, 0, SCREEN_H)
  grad.addColorStop(0, '#1a1a2e')
  grad.addColorStop(1, '#16213e')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H)

  ctx.fillStyle = '#e94560'
  ctx.font = 'bold 36px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('选关', SCREEN_W / 2, SCREEN_H * 0.18)

  drawBtn('第6关 青蛙过河', SCREEN_W * 0.15, SCREEN_H * 0.26, SCREEN_W * 0.7, SCREEN_H * 0.085, '#00bcd4')
  drawBtn('第5关 数独', SCREEN_W * 0.15, SCREEN_H * 0.37, SCREEN_W * 0.7, SCREEN_H * 0.085, '#2196f3')
  drawBtn('第4关 消消乐', SCREEN_W * 0.15, SCREEN_H * 0.48, SCREEN_W * 0.7, SCREEN_H * 0.085, '#9c27b0')
  drawBtn('第3关 扫雷', SCREEN_W * 0.15, SCREEN_H * 0.59, SCREEN_W * 0.7, SCREEN_H * 0.085, '#ff9800')
  drawBtn('第2关 贪吃蛇', SCREEN_W * 0.15, SCREEN_H * 0.70, SCREEN_W * 0.7, SCREEN_H * 0.085, '#4caf50')
  drawBtn('第1关 拼图', SCREEN_W * 0.15, SCREEN_H * 0.81, SCREEN_W * 0.7, SCREEN_H * 0.085, '#e94560')
}

function drawBtn(text, x, y, w, h, color) {
  ctx.fillStyle = color
  roundRect(x, y, w, h, 12)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 18px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, x + w / 2, y + h / 2)
  ctx.textBaseline = 'alphabetic'
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function handleMenuTouch(touch) {
  var tx = touch.clientX, ty = touch.clientY
  var bx1 = SCREEN_W * 0.15, bw = SCREEN_W * 0.7, bh = SCREEN_H * 0.085

  if (tx > bx1 && tx < bx1 + bw && ty > SCREEN_H * 0.26 && ty < SCREEN_H * 0.26 + bh) {
    startFrog(); return
  }
  if (tx > bx1 && tx < bx1 + bw && ty > SCREEN_H * 0.37 && ty < SCREEN_H * 0.37 + bh) {
    startSudoku(); return
  }
  if (tx > bx1 && tx < bx1 + bw && ty > SCREEN_H * 0.48 && ty < SCREEN_H * 0.48 + bh) {
    startMatch3(); return
  }
  if (tx > bx1 && tx < bx1 + bw && ty > SCREEN_H * 0.59 && ty < SCREEN_H * 0.59 + bh) {
    startMinesweeper(); return
  }
  if (tx > bx1 && tx < bx1 + bw && ty > SCREEN_H * 0.70 && ty < SCREEN_H * 0.70 + bh) {
    startSnake(); return
  }
  if (tx > bx1 && tx < bx1 + bw && ty > SCREEN_H * 0.81 && ty < SCREEN_H * 0.81 + bh) {
    startPuzzle(); return
  }
}

// ========== 拼图 ==========
let pzBoard = [], pzMoves = 0, pzStatus = 'playing'

function startPuzzle() {
  currentScene = 'puzzle'
  dragging = null
  pzBoard = []
  for (var r = 0; r < PUZ_ROWS; r++) {
    pzBoard[r] = []
    for (var c = 0; c < PUZ_COLS; c++) pzBoard[r][c] = r * PUZ_COLS + c
  }
  pzShuffle()
  pzMoves = 0
  pzStatus = 'playing'
  drawPuzzle()
}

function pzShuffle() {
  var flat = []
  for (var i = 0; i < 9; i++) flat.push(i)
  for (var i = flat.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1))
    var tmp = flat[i]; flat[i] = flat[j]; flat[j] = tmp
  }
  var inv = 0
  for (var i = 0; i < flat.length; i++) {
    for (var j = i + 1; j < flat.length; j++) {
      if (flat[i] > flat[j]) inv++
    }
  }
  if (inv % 2 !== 0) {
    var tmp = flat[7]; flat[7] = flat[8]; flat[8] = tmp
  }
  for (var r = 0; r < PUZ_ROWS; r++) {
    for (var c = 0; c < PUZ_COLS; c++) pzBoard[r][c] = flat[r * PUZ_COLS + c]
  }
}

function drawPuzzle() {
  ctx.clearRect(0, 0, SCREEN_W, SCREEN_H)
  var grad = ctx.createLinearGradient(0, 0, 0, SCREEN_H)
  grad.addColorStop(0, '#1a1a2e')
  grad.addColorStop(1, '#16213e')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H)

  drawBtn('← 返回', 10, 10, 80, 40, '#555')

  ctx.fillStyle = '#e94560'
  ctx.font = 'bold 24px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('第1关: 拼图', SCREEN_W / 2, 40)

  ctx.fillStyle = '#aaa'
  ctx.font = '16px sans-serif'
  ctx.fillText('步数: ' + pzMoves, SCREEN_W / 2, 65)

  ctx.strokeStyle = '#e94560'
  ctx.lineWidth = 2
  ctx.strokeRect(PUZ_GRID_X - 1, PUZ_GRID_Y - 1, PUZ_GRID_W + 2, PUZ_GRID_H + 2)

  for (var r = 0; r < PUZ_ROWS; r++) {
    for (var c = 0; c < PUZ_COLS; c++) {
      if (dragging && dragging.r === r && dragging.c === c) continue
      var idx = pzBoard[r][c]
      var x = PUZ_GRID_X + c * PUZ_PIECE_W
      var y = PUZ_GRID_Y + r * PUZ_PIECE_H
      pzDrawPiece(idx, x, y)
    }
  }
  if (dragging) {
    var idx = dragging.pieceIdx
    var x = PUZ_GRID_X + dragging.c * PUZ_PIECE_W + dragging.dx
    var y = PUZ_GRID_Y + dragging.r * PUZ_PIECE_H + dragging.dy
    ctx.shadowColor = 'rgba(0,0,0,0.5)'
    ctx.shadowBlur = 10
    pzDrawPiece(idx, x, y)
    ctx.shadowBlur = 0
  }

  if (pzStatus === 'won') {
    ctx.fillStyle = 'rgba(0,0,0,0.85)'
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H)

    var fw = PUZ_PIECE_W * PUZ_COLS, fh = PUZ_PIECE_H * PUZ_ROWS
    var dw = Math.min(SCREEN_W * 0.7, fw)
    var dh = dw * (fh / fw)
    var ix = (SCREEN_W - dw) / 2, iy = SCREEN_H * 0.06
    pzDrawComplete(ix, iy, dw)

    ctx.strokeStyle = '#ffd700'
    ctx.lineWidth = 3
    ctx.strokeRect(ix - 2, iy - 2, dw + 4, dh + 4)

    ctx.fillStyle = '#4caf50'
    ctx.font = 'bold 32px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('通关!', SCREEN_W / 2, iy + dh + 50)
    ctx.fillStyle = '#fff'
    ctx.font = '18px sans-serif'
    ctx.fillText(pzMoves + ' 步完成', SCREEN_W / 2, iy + dh + 80)

    drawBtn('← 返回选关', SCREEN_W * 0.25, SCREEN_H * 0.72, SCREEN_W * 0.5, 50, '#555')
  }
}

function pzDrawPiece(idx, x, y) {
  if (images[idx] && images[idx].width > 0) {
    ctx.drawImage(images[idx], x, y, PUZ_PIECE_W, PUZ_PIECE_H)
  } else {
    ctx.fillStyle = '#333'
    ctx.fillRect(x, y, PUZ_PIECE_W, PUZ_PIECE_H)
    ctx.fillStyle = '#666'
    ctx.font = '14px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(idx + 1, x + PUZ_PIECE_W / 2, y + PUZ_PIECE_H / 2)
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'
  ctx.lineWidth = 1
  ctx.strokeRect(x, y, PUZ_PIECE_W, PUZ_PIECE_H)
}

function pzDrawComplete(x, y, dw) {
  var pw = dw / PUZ_COLS, ph = pw * (PUZ_PIECE_H / PUZ_PIECE_W)
  for (var r = 0; r < PUZ_ROWS; r++) {
    for (var c = 0; c < PUZ_COLS; c++) {
      var idx = r * PUZ_COLS + c
      if (images[idx] && images[idx].width > 0) {
        ctx.drawImage(images[idx], x + c * pw, y + r * ph, pw, ph)
      }
    }
  }
}

function pzGetGridPos(tx, ty) {
  var col = Math.floor((tx - PUZ_GRID_X) / PUZ_PIECE_W)
  var row = Math.floor((ty - PUZ_GRID_Y) / PUZ_PIECE_H)
  if (row < 0 || row >= PUZ_ROWS || col < 0 || col >= PUZ_COLS) return null
  return { r: row, c: col }
}

function handlePuzzleTouchStart(touch) {
  if (pzStatus === 'won') {
    if (touch.clientX > SCREEN_W * 0.25 && touch.clientX < SCREEN_W * 0.75 &&
        touch.clientY > SCREEN_H * 0.72 && touch.clientY < SCREEN_H * 0.72 + 50) {
      showMenu(); return
    }
    return
  }
  if (touch.clientX > 10 && touch.clientX < 90 && touch.clientY > 10 && touch.clientY < 50) {
    showMenu(); return
  }
  var pos = pzGetGridPos(touch.clientX, touch.clientY)
  if (!pos) return
  dragging = {
    pieceIdx: pzBoard[pos.r][pos.c],
    r: pos.r, c: pos.c,
    dx: 0, dy: 0,
    startTx: touch.clientX, startTy: touch.clientY
  }
  drawPuzzle()
}

function handlePuzzleTouchEnd(touch) {
  if (!dragging) return
  var pos = pzGetGridPos(touch.clientX, touch.clientY)
  if (pos && (pos.r !== dragging.r || pos.c !== dragging.c)) {
    var tmp = pzBoard[dragging.r][dragging.c]
    pzBoard[dragging.r][dragging.c] = pzBoard[pos.r][pos.c]
    pzBoard[pos.r][pos.c] = tmp
    pzMoves++
    pzCheckWin()
  }
  dragging = null
  drawPuzzle()
}

function pzCheckWin() {
  for (var r = 0; r < PUZ_ROWS; r++) {
    for (var c = 0; c < PUZ_COLS; c++) {
      if (pzBoard[r][c] !== r * PUZ_COLS + c) return
    }
  }
  pzStatus = 'won'
  drawPuzzle()
}

// ========== 贪吃蛇 ==========
let snSnake = [], snFood = null
let snDir = { x: 1, y: 0 }, snNextDir = { x: 1, y: 0 }
let snScore = 0, snOver = false, snTarget = 3

if (!scenes.snake) scenes.snake = { interval: null }

function startSnake() {
  currentScene = 'snake'
  if (scenes.snake.interval) { clearInterval(scenes.snake.interval); scenes.snake.interval = null }

  snSnake = [
    { x: 4, y: 8 },
    { x: 3, y: 8 },
    { x: 2, y: 8 }
  ]
  snDir = { x: 1, y: 0 }
  snNextDir = { x: 1, y: 0 }
  snScore = 0
  snOver = false
  snSpawnFood()
  drawSnake()

  scenes.snake.interval = setInterval(function() {
    if (!snOver) snTick()
  }, 250)
}

function snSpawnFood() {
  var free = []
  for (var x = 0; x < SN_COLS; x++) {
    for (var y = 0; y < SN_ROWS; y++) {
      var occ = false
      for (var i = 0; i < snSnake.length; i++) {
        if (snSnake[i].x === x && snSnake[i].y === y) { occ = true; break }
      }
      if (!occ) free.push({ x: x, y: y })
    }
  }
  if (free.length > 0) snFood = free[Math.floor(Math.random() * free.length)]
}

function snTick() {
  snDir = { x: snNextDir.x, y: snNextDir.y }
  var head = { x: snSnake[0].x + snDir.x, y: snSnake[0].y + snDir.y }

  if (head.x < 0 || head.x >= SN_COLS || head.y < 0 || head.y >= SN_ROWS) {
    snOver = true; drawSnake(); return
  }
  for (var i = 0; i < snSnake.length; i++) {
    if (snSnake[i].x === head.x && snSnake[i].y === head.y) {
      snOver = true; drawSnake(); return
    }
  }

  snSnake.unshift(head)
  if (snFood && head.x === snFood.x && head.y === snFood.y) {
    snScore++
    if (snScore >= snTarget) { snOver = true; drawSnake(); return }
    snSpawnFood()
  } else {
    snSnake.pop()
  }
  drawSnake()
}

function drawSnake() {
  ctx.clearRect(0, 0, SCREEN_W, SCREEN_H)

  var grad = ctx.createLinearGradient(0, 0, 0, SCREEN_H)
  grad.addColorStop(0, '#0a1628')
  grad.addColorStop(1, '#16213e')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H)

  drawBtn('← 返回', 10, 10, 80, 40, '#555')

  ctx.fillStyle = '#4caf50'
  ctx.font = 'bold 24px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('第2关: 贪吃蛇', SCREEN_W / 2, 40)

  ctx.fillStyle = '#ffd54f'
  ctx.font = '18px sans-serif'
  ctx.fillText('得分: ' + snScore + ' / ' + snTarget, SCREEN_W / 2, 68)

  ctx.strokeStyle = '#4caf50'
  ctx.lineWidth = 2
  ctx.strokeRect(SN_X - 1, SN_Y - 1, SN_W + 2, SN_H + 2)

  ctx.strokeStyle = 'rgba(255,255,255,0.05)'
  ctx.lineWidth = 0.5
  for (var x = 0; x <= SN_COLS; x++) {
    ctx.beginPath()
    ctx.moveTo(SN_X + x * SN_CELL, SN_Y)
    ctx.lineTo(SN_X + x * SN_CELL, SN_Y + SN_H)
    ctx.stroke()
  }
  for (var y = 0; y <= SN_ROWS; y++) {
    ctx.beginPath()
    ctx.moveTo(SN_X, SN_Y + y * SN_CELL)
    ctx.lineTo(SN_X + SN_W, SN_Y + y * SN_CELL)
    ctx.stroke()
  }

  if (snFood) {
    ctx.fillStyle = '#e94560'
    ctx.beginPath()
    ctx.arc(SN_X + snFood.x * SN_CELL + SN_CELL / 2, SN_Y + snFood.y * SN_CELL + SN_CELL / 2, SN_CELL / 2.5, 0, Math.PI * 2)
    ctx.fill()
  }

  for (var i = 0; i < snSnake.length; i++) {
    ctx.fillStyle = i === 0 ? '#66bb6a' : 'rgba(76, 175, 80, ' + (1 - i / snSnake.length * 0.5) + ')'
    ctx.fillRect(SN_X + snSnake[i].x * SN_CELL + 1, SN_Y + snSnake[i].y * SN_CELL + 1, SN_CELL - 2, SN_CELL - 2)
  }

  if (snOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)'
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H)

    if (snScore >= snTarget) {
      ctx.fillStyle = '#4caf50'
      ctx.font = 'bold 36px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('通关!', SCREEN_W / 2, SCREEN_H / 2 - 30)
      ctx.fillStyle = '#fff'
      ctx.font = '20px sans-serif'
      ctx.fillText('吃了 ' + snTarget + ' 个!', SCREEN_W / 2, SCREEN_H / 2 + 10)
    } else {
      ctx.fillStyle = '#e94560'
      ctx.font = 'bold 36px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('游戏结束', SCREEN_W / 2, SCREEN_H / 2 - 30)
      ctx.fillStyle = '#fff'
      ctx.font = '20px sans-serif'
      ctx.fillText('吃了 ' + snScore + ' 个', SCREEN_W / 2, SCREEN_H / 2 + 10)
    }

    drawBtn('← 返回选关', SCREEN_W * 0.25, SCREEN_H * 0.68, SCREEN_W * 0.5, 50, '#555')
    drawBtn('再来一局', SCREEN_W * 0.25, SCREEN_H * 0.76, SCREEN_W * 0.5, 50, '#4caf50')
  }
}

function handleSnakeTouchEnd(touch) {
  var tx = touch.clientX, ty = touch.clientY

  if (snOver) {
    if (tx > SCREEN_W * 0.25 && tx < SCREEN_W * 0.75 && ty > SCREEN_H * 0.68 && ty < SCREEN_H * 0.68 + 50) {
      if (scenes.snake.interval) { clearInterval(scenes.snake.interval); scenes.snake.interval = null }
      showMenu(); return
    }
    if (tx > SCREEN_W * 0.25 && tx < SCREEN_W * 0.75 && ty > SCREEN_H * 0.76 && ty < SCREEN_H * 0.76 + 50) {
      startSnake(); return
    }
    return
  }

  if (tx > 10 && tx < 90 && ty > 10 && ty < 50) {
    if (scenes.snake.interval) { clearInterval(scenes.snake.interval); scenes.snake.interval = null }
    showMenu(); return
  }
}

// ========== 扫雷 ==========
let mineGrid = []       // { mine: bool, revealed: bool, count: int }
let mineOver = false
let mineWon = false
let mineFirstClick = true

function startMinesweeper() {
  currentScene = 'mine'
  mineOver = false
  mineWon = false
  mineFirstClick = true

  mineGrid = []
  for (var r = 0; r < MINE_ROWS; r++) {
    mineGrid[r] = []
    for (var c = 0; c < MINE_COLS; c++) {
      mineGrid[r][c] = { mine: false, revealed: false, count: 0 }
    }
  }

  drawMinesweeper()
}

function minePlaceBombs(safeR, safeC) {
  // 在 safeR/safeC 及其周围不放雷
  var safeSet = {}
  for (var dr = -1; dr <= 1; dr++) {
    for (var dc = -1; dc <= 1; dc++) {
      var nr = safeR + dr, nc = safeC + dc
      if (nr >= 0 && nr < MINE_ROWS && nc >= 0 && nc < MINE_COLS) {
        safeSet[nr + ',' + nc] = true
      }
    }
  }

  var placed = 0
  while (placed < MINE_COUNT) {
    var r = Math.floor(Math.random() * MINE_ROWS)
    var c = Math.floor(Math.random() * MINE_COLS)
    if (!mineGrid[r][c].mine && !safeSet[r + ',' + c]) {
      mineGrid[r][c].mine = true
      placed++
    }
  }

  // 计算每个格子周围雷数
  for (var r = 0; r < MINE_ROWS; r++) {
    for (var c = 0; c < MINE_COLS; c++) {
      if (mineGrid[r][c].mine) continue
      var count = 0
      for (var dr = -1; dr <= 1; dr++) {
        for (var dc = -1; dc <= 1; dc++) {
          var nr = r + dr, nc = c + dc
          if (nr >= 0 && nr < MINE_ROWS && nc >= 0 && nc < MINE_COLS && mineGrid[nr][nc].mine) {
            count++
          }
        }
      }
      mineGrid[r][c].count = count
    }
  }
}

function mineRevealCell(r, c) {
  if (r < 0 || r >= MINE_ROWS || c < 0 || c >= MINE_COLS) return
  var cell = mineGrid[r][c]
  if (cell.revealed || cell.flag) return

  cell.revealed = true

  if (cell.count === 0 && !cell.mine) {
    // 空白格，自动展开周围
    for (var dr = -1; dr <= 1; dr++) {
      for (var dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        mineRevealCell(r + dr, c + dc)
      }
    }
  }
}

function mineCheckWin() {
  for (var r = 0; r < MINE_ROWS; r++) {
    for (var c = 0; c < MINE_COLS; c++) {
      if (!mineGrid[r][c].mine && !mineGrid[r][c].revealed) return false
    }
  }
  return true
}

function drawMinesweeper() {
  ctx.clearRect(0, 0, SCREEN_W, SCREEN_H)

  var grad = ctx.createLinearGradient(0, 0, 0, SCREEN_H)
  grad.addColorStop(0, '#1a1a2e')
  grad.addColorStop(1, '#16213e')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H)

  drawBtn('← 返回', 10, 10, 80, 40, '#555')

  ctx.fillStyle = '#ff9800'
  ctx.font = 'bold 24px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('第3关: 扫雷', SCREEN_W / 2, 40)

  ctx.fillStyle = '#aaa'
  ctx.font = '16px sans-serif'
  ctx.fillText('雷: ' + MINE_COUNT, SCREEN_W / 2, 65)

  ctx.strokeStyle = '#ff9800'
  ctx.lineWidth = 2
  ctx.strokeRect(MINE_X - 1, MINE_Y - 1, MINE_W + 2, MINE_H + 2)

  // 画格子
  for (var r = 0; r < MINE_ROWS; r++) {
    for (var c = 0; c < MINE_COLS; c++) {
      var cell = mineGrid[r][c]
      var x = MINE_X + c * MINE_CELL
      var y = MINE_Y + r * MINE_CELL

      if (cell.revealed) {
        // 已翻开
        if (cell.mine) {
          ctx.fillStyle = '#e53935'
          ctx.fillRect(x, y, MINE_CELL, MINE_CELL)
          ctx.fillStyle = '#fff'
          ctx.font = (MINE_CELL * 0.5) + 'px sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText('💣', x + MINE_CELL / 2, y + MINE_CELL / 2)
        } else {
          ctx.fillStyle = '#e8e8e8'
          ctx.fillRect(x, y, MINE_CELL, MINE_CELL)
          if (cell.count > 0) {
            var colors = ['', '#1565c0', '#2e7d32', '#e53935', '#6a1b9a', '#e65100', '#00838f', '#000', '#888']
            ctx.fillStyle = colors[cell.count] || '#000'
            ctx.font = 'bold ' + (MINE_CELL * 0.45) + 'px sans-serif'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(cell.count, x + MINE_CELL / 2, y + MINE_CELL / 2)
          }
        }
      } else {
        // 未翻开
        ctx.fillStyle = '#37474f'
        ctx.fillRect(x, y, MINE_CELL, MINE_CELL)
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'
        ctx.lineWidth = 1
        ctx.strokeRect(x, y, MINE_CELL, MINE_CELL)
      }
    }
  }

  ctx.textBaseline = 'alphabetic'

  // 游戏结束/通关
  if (mineOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)'
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H)

    if (mineWon) {
      ctx.fillStyle = '#4caf50'
      ctx.font = 'bold 36px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('通关!', SCREEN_W / 2, SCREEN_H / 2 - 30)
      ctx.fillStyle = '#fff'
      ctx.font = '20px sans-serif'
      ctx.fillText('全部排雷成功!', SCREEN_W / 2, SCREEN_H / 2 + 10)
    } else {
      ctx.fillStyle = '#e94560'
      ctx.font = 'bold 36px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('踩雷了!', SCREEN_W / 2, SCREEN_H / 2 - 30)
    }

    drawBtn('← 返回选关', SCREEN_W * 0.25, SCREEN_H * 0.68, SCREEN_W * 0.5, 50, '#555')
    drawBtn('再来一局', SCREEN_W * 0.25, SCREEN_H * 0.76, SCREEN_W * 0.5, 50, '#ff9800')
  }
}

function mineGetCellPos(tx, ty) {
  var col = Math.floor((tx - MINE_X) / MINE_CELL)
  var row = Math.floor((ty - MINE_Y) / MINE_CELL)
  if (row < 0 || row >= MINE_ROWS || col < 0 || col >= MINE_COLS) return null
  return { r: row, c: col }
}

function handleMineTouchEnd(touch) {
  var tx = touch.clientX, ty = touch.clientY

  // 安全检测: 只在扫雷场景且已初始化时处理
  if (currentScene !== 'mine' || !mineGrid) return

  if (mineOver) {
    if (tx > SCREEN_W * 0.25 && tx < SCREEN_W * 0.75 && ty > SCREEN_H * 0.68 && ty < SCREEN_H * 0.68 + 50) {
      showMenu(); return
    }
    if (tx > SCREEN_W * 0.25 && tx < SCREEN_W * 0.75 && ty > SCREEN_H * 0.76 && ty < SCREEN_H * 0.76 + 50) {
      startMinesweeper(); return
    }
    return
  }

  if (tx > 10 && tx < 90 && ty > 10 && ty < 50) {
    showMenu(); return
  }

  var pos = mineGetCellPos(tx, ty)
  if (!pos) return

  // 短按翻格子
  var cell = mineGrid[pos.r][pos.c]
  if (cell.revealed) return

  if (mineFirstClick) {
    mineFirstClick = false
    minePlaceBombs(pos.r, pos.c)
  }

  if (cell.mine) {
    // 踩雷，显示全部
    mineOver = true
    mineWon = false
    for (var r = 0; r < MINE_ROWS; r++) {
      for (var c = 0; c < MINE_COLS; c++) {
        if (mineGrid[r][c].mine) mineGrid[r][c].revealed = true
      }
    }
    drawMinesweeper()
    return
  }

  mineRevealCell(pos.r, pos.c)

  if (mineCheckWin()) {
    mineOver = true
    mineWon = true
  }

  drawMinesweeper()
}

// ========== 消消乐 ==========
let m3Board = []
let m3Score = 0
let m3Over = false
let m3Won = false
let m3Selected = null
let m3Busy = false  // 动画进行中
let m3TouchX = 0, m3TouchY = 0

function startMatch3() {
  currentScene = 'match3'
  m3Score = 0
  m3Over = false
  m3Won = false
  m3Selected = null
  m3Busy = false

  // 生成棋盘，确保没有初始匹配
  m3Board = []
  for (var r = 0; r < M3_ROWS; r++) {
    m3Board[r] = []
    for (var c = 0; c < M3_COLS; c++) {
      var type
      do {
        type = Math.floor(Math.random() * M3_COLORS.length)
      } while (
        (c >= 2 && m3Board[r][c-1] === type && m3Board[r][c-2] === type) ||
        (r >= 2 && m3Board[r-1][c] === type && m3Board[r-2][c] === type)
      )
      m3Board[r][c] = type
    }
  }

  drawMatch3()
}

function m3FindMatches() {
  var matched = {}

  // 横向
  for (var r = 0; r < M3_ROWS; r++) {
    for (var c = 0; c < M3_COLS - 2; c++) {
      var t = m3Board[r][c]
      if (t < 0) continue
      if (m3Board[r][c+1] === t && m3Board[r][c+2] === t) {
        matched[r + ',' + c] = true
        matched[r + ',' + (c+1)] = true
        matched[r + ',' + (c+2)] = true
      }
    }
  }

  // 纵向
  for (var c = 0; c < M3_COLS; c++) {
    for (var r = 0; r < M3_ROWS - 2; r++) {
      var t = m3Board[r][c]
      if (t < 0) continue
      if (m3Board[r+1][c] === t && m3Board[r+2][c] === t) {
        matched[r + ',' + c] = true
        matched[(r+1) + ',' + c] = true
        matched[(r+2) + ',' + c] = true
      }
    }
  }

  var result = []
  for (var key in matched) {
    var parts = key.split(',')
    result.push({ r: parseInt(parts[0]), c: parseInt(parts[1]) })
  }
  return result
}

function m3RemoveMatches(matches) {
  for (var i = 0; i < matches.length; i++) {
    m3Board[matches[i].r][matches[i].c] = -1
  }
  m3Score += matches.length * 10
}

function m3ApplyGravity() {
  for (var c = 0; c < M3_COLS; c++) {
    var writeRow = M3_ROWS - 1
    for (var r = M3_ROWS - 1; r >= 0; r--) {
      if (m3Board[r][c] >= 0) {
        m3Board[writeRow][c] = m3Board[r][c]
        if (writeRow !== r) m3Board[r][c] = -1
        writeRow--
      }
    }
  }
}

function m3Refill() {
  for (var c = 0; c < M3_COLS; c++) {
    for (var r = 0; r < M3_ROWS; r++) {
      if (m3Board[r][c] < 0) {
        m3Board[r][c] = Math.floor(Math.random() * M3_COLORS.length)
      }
    }
  }
}

function m3ProcessMatches() {
  m3Busy = true
  var matches = m3FindMatches()

  if (matches.length === 0) {
    m3Busy = false
    drawMatch3()
    if (m3Score >= M3_TARGET && !m3Over) {
      m3Over = true
      m3Won = true
      drawMatch3()
    }
    return
  }

  m3RemoveMatches(matches)
  drawMatch3()

  setTimeout(function() {
    m3ApplyGravity()
    m3Refill()
    drawMatch3()

    setTimeout(function() {
      m3ProcessMatches()
    }, 200)
  }, 300)
}

function drawMatch3() {
  ctx.clearRect(0, 0, SCREEN_W, SCREEN_H)

  var grad = ctx.createLinearGradient(0, 0, 0, SCREEN_H)
  grad.addColorStop(0, '#1a1a2e')
  grad.addColorStop(1, '#16213e')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H)

  drawBtn('← 返回', 10, 10, 80, 40, '#555')

  ctx.fillStyle = '#9c27b0'
  ctx.font = 'bold 24px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('第4关: 消消乐', SCREEN_W / 2, 40)

  ctx.fillStyle = '#ffd54f'
  ctx.font = '18px sans-serif'
  ctx.fillText('得分: ' + m3Score + ' / ' + M3_TARGET, SCREEN_W / 2, 68)

  ctx.strokeStyle = '#9c27b0'
  ctx.lineWidth = 2
  ctx.strokeRect(M3_X - 1, M3_Y - 1, M3_W + 2, M3_H + 2)

  // 画格子
  for (var r = 0; r < M3_ROWS; r++) {
    for (var c = 0; c < M3_COLS; c++) {
      var type = m3Board[r][c]
      var x = M3_X + c * M3_CELL
      var y = M3_Y + r * M3_CELL

      if (type < 0) {
        ctx.fillStyle = '#222'
        ctx.fillRect(x, y, M3_CELL, M3_CELL)
      } else {
        ctx.fillStyle = M3_COLORS[type]
        roundRect(x + 2, y + 2, M3_CELL - 4, M3_CELL - 4, 6)
        ctx.fill()

        // 选中高亮
        if (m3Selected && m3Selected.r === r && m3Selected.c === c) {
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 3
          ctx.strokeRect(x, y, M3_CELL, M3_CELL)
        }
      }

      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.lineWidth = 1
      ctx.strokeRect(x, y, M3_CELL, M3_CELL)
    }
  }

  // 游戏结束/通关
  if (m3Over) {
    ctx.fillStyle = 'rgba(0,0,0,0.75)'
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H)

    if (m3Won) {
      ctx.fillStyle = '#4caf50'
      ctx.font = 'bold 36px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('通关!', SCREEN_W / 2, SCREEN_H / 2 - 30)
      ctx.fillStyle = '#fff'
      ctx.font = '20px sans-serif'
      ctx.fillText('得分 ' + m3Score, SCREEN_W / 2, SCREEN_H / 2 + 10)
    }

    drawBtn('← 返回选关', SCREEN_W * 0.25, SCREEN_H * 0.68, SCREEN_W * 0.5, 50, '#555')
    drawBtn('再来一局', SCREEN_W * 0.25, SCREEN_H * 0.76, SCREEN_W * 0.5, 50, '#9c27b0')
  }
}

function m3GetCellPos(tx, ty) {
  var col = Math.floor((tx - M3_X) / M3_CELL)
  var row = Math.floor((ty - M3_Y) / M3_CELL)
  if (row < 0 || row >= M3_ROWS || col < 0 || col >= M3_COLS) return null
  return { r: row, c: col }
}

function handleMatch3TouchEnd(touch) {
  var tx = touch.clientX, ty = touch.clientY

  if (m3Over) {
    if (tx > SCREEN_W * 0.25 && tx < SCREEN_W * 0.75 && ty > SCREEN_H * 0.68 && ty < SCREEN_H * 0.68 + 50) {
      showMenu(); return
    }
    if (tx > SCREEN_W * 0.25 && tx < SCREEN_W * 0.75 && ty > SCREEN_H * 0.76 && ty < SCREEN_H * 0.76 + 50) {
      startMatch3(); return
    }
    return
  }

  if (tx > 10 && tx < 90 && ty > 10 && ty < 50) {
    showMenu(); return
  }

  if (m3Busy) return

  var pos = m3GetCellPos(tx, ty)
  if (!pos) return

  if (!m3Selected) {
    m3Selected = { r: pos.r, c: pos.c }
    drawMatch3()
    return
  }

  // 已选中一个，检查是否相邻
  var dr = Math.abs(m3Selected.r - pos.r)
  var dc = Math.abs(m3Selected.c - pos.c)

  if (dr + dc === 1) {
    // 交换
    var tmp = m3Board[m3Selected.r][m3Selected.c]
    m3Board[m3Selected.r][m3Selected.c] = m3Board[pos.r][pos.c]
    m3Board[pos.r][pos.c] = tmp

    var matches = m3FindMatches()
    if (matches.length > 0) {
      m3Selected = null
      m3ProcessMatches()
    } else {
      // 换回来
      tmp = m3Board[m3Selected.r][m3Selected.c]
      m3Board[m3Selected.r][m3Selected.c] = m3Board[pos.r][pos.c]
      m3Board[pos.r][pos.c] = tmp
      m3Selected = null
      drawMatch3()
    }
  } else {
    // 不相邻，重新选中
    m3Selected = { r: pos.r, c: pos.c }
    drawMatch3()
  }
}

// ========== 数独 ==========
let sdSolution = []      // 完整答案 9x9
let sdBoard = []         // 当前棋盘 9x9 (0=空)
let sdGiven = []         // 哪些格子是题目给的(不可改) 9x9 bool
let sdSelected = null    // {r, c} 选中的格子
let sdOver = false
let sdWon = false
let sdTimer = 0
let sdTimerInterval = null
let sdTouchX = 0, sdTouchY = 0

// 第五关题目和答案 (简单难度)
const SD_LEVEL5_SOLUTION = [
  [5,3,4,6,7,8,9,1,2],
  [6,7,2,1,9,5,3,4,8],
  [1,9,8,3,4,2,5,6,7],
  [8,5,9,7,6,1,4,2,3],
  [4,2,6,8,5,3,7,9,1],
  [7,1,3,9,2,4,8,5,6],
  [9,6,1,5,3,7,2,8,4],
  [2,8,7,4,1,9,6,3,5],
  [3,4,5,2,8,6,1,7,9]
]
const SD_LEVEL5_GIVEN = [
  [1,1,1,1,1,0,0,1,1],
  [1,1,1,1,1,1,1,1,1],
  [1,1,0,1,1,1,1,1,0],
  [1,1,1,0,1,1,1,1,1],
  [1,1,1,1,1,1,1,0,1],
  [1,0,1,1,1,1,1,1,1],
  [1,1,1,1,1,1,0,1,1],
  [1,1,1,1,1,0,1,1,1],
  [1,1,1,1,0,1,1,1,1]
]

function startSudoku() {
  currentScene = 'sudoku'
  if (sdTimerInterval) { clearInterval(sdTimerInterval); sdTimerInterval = null }

  sdSolution = SD_LEVEL5_SOLUTION.map(r => r.slice())
  sdBoard = SD_LEVEL5_SOLUTION.map((row, r) => row.map((v, c) => SD_LEVEL5_GIVEN[r][c] ? v : 0))
  sdGiven = SD_LEVEL5_GIVEN.map(r => r.slice())
  sdSelected = null
  sdOver = false
  sdWon = false
  sdTimer = 0
  sdTimerInterval = setInterval(function() { sdTimer++; drawSudoku() }, 1000)
  drawSudoku()
}

function drawSudoku() {
  ctx.clearRect(0, 0, SCREEN_W, SCREEN_H)
  var grad = ctx.createLinearGradient(0, 0, 0, SCREEN_H)
  grad.addColorStop(0, '#1a1a2e')
  grad.addColorStop(1, '#16213e')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H)

  drawBtn('← 返回', 10, 10, 80, 40, '#555')

  ctx.fillStyle = '#2196f3'
  ctx.font = 'bold 24px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('第5关: 数独', SCREEN_W / 2, 40)

  var min = Math.floor(sdTimer / 60)
  var sec = sdTimer % 60
  ctx.fillStyle = '#aaa'
  ctx.font = '16px sans-serif'
  ctx.fillText(min + '分' + sec + '秒', SCREEN_W / 2, 62)

  // 画9x9格子
  ctx.strokeStyle = '#2196f3'
  ctx.lineWidth = 2
  ctx.strokeRect(SD_X - 1, SD_Y - 1, SD_W + 2, SD_H + 2)

  for (var r = 0; r < 9; r++) {
    for (var c = 0; c < 9; c++) {
      var x = SD_X + c * SD_CELL
      var y = SD_Y + r * SD_CELL

      // 背景
      if (sdSelected && sdSelected.r === r && sdSelected.c === c) {
        ctx.fillStyle = 'rgba(33,150,243,0.3)'
      } else if (sdSelected && (sdSelected.r === r || sdSelected.c === c)) {
        ctx.fillStyle = 'rgba(255,255,255,0.08)'
      } else {
        ctx.fillStyle = (Math.floor(r / 3) + Math.floor(c / 3)) % 2 === 0 ? '#2a2a3e' : '#252538'
      }
      ctx.fillRect(x, y, SD_CELL, SD_CELL)

      // 3x3宫格粗线
      if (r % 3 === 0) { ctx.strokeStyle = '#2196f3'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(SD_X, y); ctx.lineTo(SD_X + SD_W, y); ctx.stroke() }
      if (c % 3 === 0) { ctx.strokeStyle = '#2196f3'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, SD_Y); ctx.lineTo(x, SD_Y + SD_H); ctx.stroke() }

      // 数字
      if (sdBoard[r][c] > 0) {
        ctx.fillStyle = sdGiven[r][c] ? '#fff' : '#64b5f6'
        ctx.font = 'bold ' + (SD_CELL * 0.5) + 'px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(sdBoard[r][c], x + SD_CELL / 2, y + SD_CELL / 2)
      }

      // 格子细线
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.lineWidth = 0.5
      ctx.strokeRect(x, y, SD_CELL, SD_CELL)
    }
  }
  ctx.textBaseline = 'alphabetic'

  // 数字键盘
  var nums = [1,2,3,4,5,6,7,8,9,'清除']
  for (var i = 0; i < nums.length; i++) {
    var col = i % 5
    var row2 = Math.floor(i / 5)
    var nx = NUMPAD_X + col * NUMPAD_CELL
    var ny = NUMPAD_Y + row2 * NUMPAD_CELL
    ctx.fillStyle = nums[i] === '清除' ? '#e94560' : '#37474f'
    roundRect(nx + 2, ny + 2, NUMPAD_CELL - 4, NUMPAD_CELL - 4, 6)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold ' + (NUMPAD_CELL * 0.45) + 'px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(nums[i], nx + NUMPAD_CELL / 2, ny + NUMPAD_CELL / 2)
  }
  ctx.textBaseline = 'alphabetic'

  // 游戏结束
  if (sdOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.8)'
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H)
    if (sdWon) {
      ctx.fillStyle = '#4caf50'
      ctx.font = 'bold 36px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('通关!', SCREEN_W / 2, SCREEN_H / 2 - 30)
      ctx.fillStyle = '#fff'
      ctx.font = '20px sans-serif'
      ctx.fillText('用时 ' + min + '分' + sec + '秒', SCREEN_W / 2, SCREEN_H / 2 + 10)
    }
    drawBtn('← 返回选关', SCREEN_W * 0.25, SCREEN_H * 0.62, SCREEN_W * 0.5, 50, '#555')
  }
}

function sdGetCellPos(tx, ty) {
  var col = Math.floor((tx - SD_X) / SD_CELL)
  var row = Math.floor((ty - SD_Y) / SD_CELL)
  if (row < 0 || row >= 9 || col < 0 || col >= 9) return null
  return { r: row, c: col }
}

function sdGetNumPad(tx, ty) {
  for (var i = 0; i < 10; i++) {
    var col = i % 5
    var row2 = Math.floor(i / 5)
    var nx = NUMPAD_X + col * NUMPAD_CELL
    var ny = NUMPAD_Y + row2 * NUMPAD_CELL
    if (tx > nx && tx < nx + NUMPAD_CELL && ty > ny && ty < ny + NUMPAD_CELL) {
      return i < 9 ? (i + 1) : 0  // 0 = 清除
    }
  }
  return null
}

function handleSudokuTouchEnd(touch) {
  var tx = touch.clientX, ty = touch.clientY

  if (sdOver) {
    if (tx > SCREEN_W * 0.25 && tx < SCREEN_W * 0.75 && ty > SCREEN_H * 0.62 && ty < SCREEN_H * 0.62 + 50) {
      if (sdTimerInterval) { clearInterval(sdTimerInterval); sdTimerInterval = null }
      showMenu(); return
    }
    return
  }

  if (tx > 10 && tx < 90 && ty > 10 && ty < 50) {
    if (sdTimerInterval) { clearInterval(sdTimerInterval); sdTimerInterval = null }
    showMenu(); return
  }

  // 数字键盘
  var num = sdGetNumPad(tx, ty)
  if (num !== null) {
    if (sdSelected && !sdGiven[sdSelected.r][sdSelected.c]) {
      sdBoard[sdSelected.r][sdSelected.c] = num
      // 检查是否全部填满且正确
      sdCheckWin()
      drawSudoku()
    }
    return
  }

  // 棋盘格子
  var pos = sdGetCellPos(tx, ty)
  if (pos) {
    sdSelected = { r: pos.r, c: pos.c }
    drawSudoku()
  }
}

function sdCheckWin() {
  for (var r = 0; r < 9; r++) {
    for (var c = 0; c < 9; c++) {
      if (sdBoard[r][c] !== sdSolution[r][c]) return
    }
  }
  sdOver = true
  sdWon = true
  if (sdTimerInterval) { clearInterval(sdTimerInterval); sdTimerInterval = null }
  drawSudoku()
}

// ========== 青蛙过河 ==========
function startFrog() {
  currentScene = 'frog'
  frogBoard = []
  for (var i = 0; i < FROG_COUNT; i++) frogBoard.push(0)  // 0=左青蛙
  frogBoard.push(2)  // 2=空
  for (var i = 0; i < FROG_COUNT; i++) frogBoard.push(1)  // 1=右青蛙
  frogSelected = -1
  frogMoves = 0
  frogOver = false
  frogWon = false
  drawFrog()
}

function drawFrog() {
  ctx.clearRect(0, 0, SCREEN_W, SCREEN_H)
  var grad = ctx.createLinearGradient(0, 0, 0, SCREEN_H)
  grad.addColorStop(0, '#1a1a2e')
  grad.addColorStop(1, '#16213e')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, SCREEN_W, SCREEN_H)

  drawBtn('← 返回', 10, 10, 80, 40, '#555')

  ctx.fillStyle = '#00bcd4'
  ctx.font = 'bold 24px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('第6关: 青蛙过河', SCREEN_W / 2, 40)

  ctx.fillStyle = '#aaa'
  ctx.font = '16px sans-serif'
  ctx.fillText('步数: ' + frogMoves + '  |  点击青蛙移动', SCREEN_W / 2, 62)

  // 画格子
  var total = FROG_COUNT * 2 + 1
  for (var i = 0; i < total; i++) {
    var x = FROG_X + i * FROG_CELL
    var y = FROG_Y
    var type = frogBoard[i]

    // 背景
    if (frogSelected === i) {
      ctx.fillStyle = 'rgba(0,188,212,0.4)'
    } else if (type === 2) {
      ctx.fillStyle = '#333348'
    } else {
      ctx.fillStyle = '#2a2a3e'
    }
    ctx.fillRect(x + 2, y + 2, FROG_CELL - 4, FROG_CELL - 4)

    // 边框
    ctx.strokeStyle = frogSelected === i ? '#00bcd4' : 'rgba(255,255,255,0.2)'
    ctx.lineWidth = frogSelected === i ? 2 : 1
    ctx.strokeRect(x + 2, y + 2, FROG_CELL - 4, FROG_CELL - 4)

    // 青蛙
    if (type === 0) {
      // 左青蛙 - 绿色
      ctx.fillStyle = '#4caf50'
      ctx.beginPath()
      ctx.arc(x + FROG_CELL / 2, y + FROG_CELL / 2, FROG_CELL * 0.35, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = 'bold ' + (FROG_CELL * 0.35) + 'px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('→', x + FROG_CELL / 2, y + FROG_CELL / 2)
    } else if (type === 1) {
      // 右青蛙 - 蓝色
      ctx.fillStyle = '#2196f3'
      ctx.beginPath()
      ctx.arc(x + FROG_CELL / 2, y + FROG_CELL / 2, FROG_CELL * 0.35, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = 'bold ' + (FROG_CELL * 0.35) + 'px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('←', x + FROG_CELL / 2, y + FROG_CELL / 2)
    }

    // 底部文字
    if (type === 0) {
      ctx.fillStyle = '#4caf50'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('左', x + FROG_CELL / 2, y + FROG_CELL - 4)
    } else if (type === 1) {
      ctx.fillStyle = '#2196f3'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('右', x + FROG_CELL / 2, y + FROG_CELL - 4)
    }
  }
  ctx.textBaseline = 'alphabetic'

  // 提示
  ctx.fillStyle = '#666'
  ctx.font = '14px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('目标: 左右青蛙互换位置', SCREEN_W / 2, FROG_Y + FROG_CELL + 30)

  // 规则
  ctx.fillStyle = '#555'
  ctx.font = '12px sans-serif'
  ctx.fillText('点击青蛙选中, 再点击空格移动到空位', SCREEN_W / 2, FROG_Y + FROG_CELL + 50)
  ctx.fillText('可走一步 或 跳过一只青蛙', SCREEN_W / 2, FROG_Y + FROG_CELL + 68)

  // 通关
  if (frogOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.8)'
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H)
    if (frogWon) {
      ctx.fillStyle = '#4caf50'
      ctx.font = 'bold 36px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('通关!', SCREEN_W / 2, SCREEN_H / 2 - 30)
      ctx.fillStyle = '#fff'
      ctx.font = '20px sans-serif'
      ctx.fillText('用了 ' + frogMoves + ' 步', SCREEN_W / 2, SCREEN_H / 2 + 10)
    }
    drawBtn('← 返回选关', SCREEN_W * 0.25, SCREEN_H * 0.62, SCREEN_W * 0.5, 50, '#555')
  }
}

function frogCanMove(idx) {
  var type = frogBoard[idx]
  if (type === 2) return false  // 空格不能动

  if (type === 0) {
    // 左青蛙向右移动
    var empty = frogBoard.indexOf(2)
    if (idx < empty) {
      var dist = empty - idx
      if (dist === 1 || dist === 2) {
        // 如果跳2格, 中间必须有青蛙
        if (dist === 2 && frogBoard[idx + 1] !== 2) return true
        if (dist === 1) return true
      }
    }
  } else if (type === 1) {
    // 右青蛙向左移动
    var empty = frogBoard.indexOf(2)
    if (idx > empty) {
      var dist = idx - empty
      if (dist === 1 || dist === 2) {
        // 如果跳2格, 中间必须有青蛙
        if (dist === 2 && frogBoard[idx - 1] !== 2) return true
        if (dist === 1) return true
      }
    }
  }
  return false
}

function frogDoMove(idx) {
  var empty = frogBoard.indexOf(2)
  var o = frogBoard[empty]
  frogBoard[empty] = frogBoard[idx]
  frogBoard[idx] = o
  frogMoves++
}

function frogCheckWin() {
  // 左边的都应该是右青蛙(1), 右边的都应该是左青蛙(0)
  for (var i = 0; i < FROG_COUNT; i++) {
    if (frogBoard[i] !== 1) return false
  }
  if (frogBoard[FROG_COUNT] !== 2) return false
  for (var i = FROG_COUNT + 1; i < frogBoard.length; i++) {
    if (frogBoard[i] !== 0) return false
  }
  return true
}

function handleFrogTouchEnd(touch) {
  var tx = touch.clientX, ty = touch.clientY

  if (frogOver) {
    if (tx > SCREEN_W * 0.25 && tx < SCREEN_W * 0.75 && ty > SCREEN_H * 0.62 && ty < SCREEN_H * 0.62 + 50) {
      showMenu(); return
    }
    return
  }

  // 返回按钮
  if (tx > 10 && tx < 90 && ty > 10 && ty < 50) {
    showMenu(); return
  }

  // 点击格子
  var total = FROG_COUNT * 2 + 1
  for (var i = 0; i < total; i++) {
    var x = FROG_X + i * FROG_CELL
    var y = FROG_Y
    if (tx > x + 2 && tx < x + FROG_CELL - 2 && ty > y + 2 && ty < y + FROG_CELL - 2) {
      var type = frogBoard[i]

      if (type === 2) {
        // 点击空格 - 如果已选中青蛙, 则移动
        if (frogSelected >= 0 && frogCanMove(frogSelected)) {
          frogDoMove(frogSelected)
          frogSelected = -1
          if (frogCheckWin()) {
            frogOver = true
            frogWon = true
          }
        }
      } else {
        // 点击青蛙 - 选中
        if (frogCanMove(i)) {
          frogSelected = (frogSelected === i) ? -1 : i
        }
      }
      drawFrog()
      return
    }
  }
}

wx.onTouchStart(onGlobalTouchStart)
wx.onTouchMove(onGlobalTouchMove)
wx.onTouchEnd(onGlobalTouchEnd)

init()

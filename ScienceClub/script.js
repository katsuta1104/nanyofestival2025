const N = 5; // グリッドのサイズ
const boardEl = document.getElementById("board");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const howtoBtn = document.getElementById("howtoBtn");
const cpuDifficulty = document.getElementById("cpuDifficulty");
const logEl = document.getElementById("log");
const thinkingEl = document.getElementById("thinking");
const floatingEl = document.getElementById("floating");
const gameOverEl = document.getElementById("gameOver");
const gameOverTitle = document.getElementById("gameOverTitle");
const gameOverSub = document.getElementById("gameOverSub");
const backToTitle = document.getElementById("backToTitle");

// あらかじめペアを構築しておく
const pairSets = [
    [[1,6],[2,7],[3,8],[4,9],[5,10],[11,16],[12,17],[13,18],[14,19],[15,20],[21,22],[23,24]],
    [[1,2],[3,4],[5,6],[7,8],[9,14],[10,11],[12,13],[15,16],[17,18],[19,24],[20,21],[22,23]],
    [[1,5],[2,6],[3,7],[4,8],[9,13],[10,11],[12,17],[14,19],[15,16],[18,24],[20,21],[22,23]],
    [[1,6],[2,3],[4,9],[5,10],[7,8],[11,12],[13,18],[14,19],[15,20],[16,17],[21,22],[23,24]],
    [[1,2],[6,7],[11,12],[16,17],[3,4],[8,9],[13,14],[18,19],[5,10],[15,20],[21,22],[23,24]],
]

let pairMap = {};

let visited = new Array(N*N).fill(false);
let current = null;
let running = false;
let playerTurn = true;
let animating = false;

function idxToRC(id){return [Math.floor(id/N),id%N];}
function rcToIdx(r,c){return r*N+c;}
function neighbors(id){
    const [r,c] = idxToRC(id);
    const res = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++){
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < N && nc >= 0 && nc < N){
            res.push(rcToIdx(nr,nc));
        }
    }
    return res;
}

function createBoard(){
    boardEl.innerHTML = "";
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++){
        const id = rcToIdx(r,c);
        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.id = id;
        cell.innerHTML = `<span class = "coords">${r},${c}</span>`;
        cell.addEventListener("click",()=>onCellClick(id));
        boardEl.appendChild(cell);
    }
}

function updateUI(){
    for (const cell of boardEl.children){
        const id = Number(cell.dataset.id);
        cell.classList.toggle("visited", visited[id]);
        cell.classList.toggle("current", id === current);
        cell.classList.remove("available");
        const piece = cell.querySelector(".piece");
        if (piece) piece.remove();
    }
    if (!animating && current !== null){
        const el = boardEl.querySelector(`.cell[data-id='${current}']`);
        if (el){
            const p = document.createElement("div");
            p.className = "piece";
            p.textContent = '♟︎';
            el.appendChild(p);
        }
    }

    if (running && playerTurn && current !== null){
        const legal = legalMovesFrom(current);
        legal.forEach(id => {
            const el = boardEl.querySelector(`.cell[data-id='${id}']`);
            if (el) el.classList.add("available");
        });
    }
}

function log(msg){
    const d = document.createElement("div");
    d.textContent = msg;
    logEl.prepend(d);
}

function legalMovesFrom(id){ return neighbors(id).filter(n => !visited[n]);}

function onCellClick(id){
    if (!running) return ;
    if (!playerTurn) return;
    if (animating) return;
    const legal = legalMovesFrom(current);
    if (!legal.includes(id)) return;
    doMoveAnimated(current,id,"Player")
}

function doMoveAnimated(fromId, toId, who){
  animating = true;
  const boardRect = boardEl.getBoundingClientRect();
  const fromEl = boardEl.querySelector(`.cell[data-id='${fromId}']`);
  const toEl = boardEl.querySelector(`.cell[data-id='${toId}']`);

  if(!fromEl || !toEl){
    current = toId;
    visited[toId] = true;
    animating = false;
    updateUI();
    log(`${who} -> (${idxToRC(toId).join(",")}) (no animation)`);
    // 後処理
    const nextLegal = legalMovesFrom(current);
    if(nextLegal.length === 0){ running = false; updateUI(); const loser=(who==='Player'?'CPU':'Player'); const winner=(who==='Player'?'Player':'CPU'); log(`ゲーム終了: ${loser} は動けません。${winner} の勝ちです。`); hideThinking(); showGameOver(winner); return; }
    playerTurn = !playerTurn;
    if(!playerTurn) cpuThinkThenReply(); else hideThinking();
    return;
  }

  const fromRect = fromEl.getBoundingClientRect();
  const toRect = toEl.getBoundingClientRect();
  const pieceSize = Math.min(fromRect.width, fromRect.height) * 0.8;

  floatingEl.style.display = 'block';
  floatingEl.style.visibility = 'visible';
  floatingEl.style.fontSize = Math.round(pieceSize) + 'px';

  const startX = (fromRect.left - boardRect.left) + fromRect.width/2;
  const startY = (fromRect.top - boardRect.top) + fromRect.height/2;
  const endX = (toRect.left - boardRect.left) + toRect.width/2;
  const endY = (toRect.top - boardRect.top) + toRect.height/2;

  floatingEl.style.left = startX + 'px';
  floatingEl.style.top = startY + 'px';

  void floatingEl.getBoundingClientRect();

  let finished = false;
  const safeTimeout = setTimeout(() => {
    if (!finished) {
      finished = true;
      cleanupAfterAnim();
    }
  }, 900);

  function cleanupAfterAnim(){
    clearTimeout(safeTimeout);
    floatingEl.style.display = 'none';
    floatingEl.style.visibility = 'hidden';
    current = toId;
    visited[toId] = true;
    animating = false;
    updateUI();
    log(`${who} -> (${idxToRC(toId).join(",")})`);
    const nextLegal = legalMovesFrom(current);
    if(nextLegal.length === 0){
      running = false; updateUI();
      const loser = (who === 'Player') ? 'CPU' : 'Player';
      const winner = (who === 'Player') ? 'Player' : 'CPU';
      log(`ゲーム終了: ${loser} は動けません。${winner} の勝ちです。`);
      hideThinking();
      showGameOver(winner);
      return;
    }
    playerTurn = !playerTurn;
    updateUI();
    if(!playerTurn) cpuThinkThenReply(); else hideThinking();
  }

  function onEnd(e){
    if (finished) return;
    finished = true;
    floatingEl.removeEventListener('transitionend', onEnd);
    cleanupAfterAnim();
  }

  floatingEl.addEventListener('transitionend', onEnd);

  // 開始
  requestAnimationFrame(()=> {
    floatingEl.style.left = endX + 'px';
    floatingEl.style.top = endY + 'px';
  });
}


function cpuThinkThenReply(){
    showThinking();
    setTimeout(() => {
        const part = pairMap[current];
        let choice = null;
        if (part !== undefined && !visited[part]){choice = part;}
        else{
            const legal = legalMovesFrom(current);
            if (legal.length > 0){
                choice = legal[Math.floor(Math.random()*legal.length)];
            }
        }
        if (choice !== null){
            doMoveAnimated(current,choice,"CPU");
        }
        else{
            // 動けない
            running = false;
            updateUI();
            log(`ゲーム終了: CPUは動けません。Playerの勝ちです。`);
            hideThinking();
            showGameOver("Player");
        }
    },
    650 + Math.floor(Math.random()*400));
}
function showThinking(){thinkingEl.style.display = "flex";}
function hideThinking(){thinkingEl.style.display = "none";}

function showGameOver(winner){
    gameOverTitle.textContent = "ゲーム終了";
    gameOverSub.textContent = (winner === "Player") ? "あなたの勝ちです！" : "CPUの勝ちです。";
    gameOverEl.classList.add("open");
    gameOverEl.setAttribute("aria-hidden","false");
}

function hideGameOver(){
    gameOverEl.classList.remove("open");
    gameOverEl.setAttribute("aria-hidden","true");
}

startBtn.addEventListener("click",()=>{
    const chosen = pairSets[Math.floor(Math.random()*pairSets.length)];
    pairMap = {};
    chosen.forEach(p => { pairMap[p[0]] = p[1]; pairMap[p[1]] = p[0]; });
    visited = new Array(N*N).fill(false);
    current = rcToIdx(0,0);
    visited[current] = true;
    running = true;
    playerTurn = true;
    animating = false;
    logEl.innerHTML = "";
    hideThinking();
    hideGameOver();
    log("ゲーム開始。初期位置は(0,0)です。Playerの手番です。");
    updateUI();
});

resetBtn.addEventListener("click",()=>{
    visited = new Array(N*N).fill(false);
    current = null;
    running = false;
    playerTurn = true;
    animating = false;
    logEl.innerHTML = "";
    updateUI();
    hideThinking();
    floatingEl.style.display = "none";
    hideGameOver();
});


backToTitle.addEventListener("click",()=>{
    hideGameOver();
    visited = new Array(N*N).fill(false);
    current = null;
    running = false;
    playerTurn = true;
    animating = false;
    logEl.innerHTML = "";
    updateUI();
    hideThinking();
    floatingEl.style.display = "none";
});

//これはlog表示だけ
cpuDifficulty.addEventListener("change",(e)=>{
    log(`CPU設定: ${cpuDifficulty.options[cpuDifficulty.selectedIndex].text}`);
});


createBoard();
updateUI();
log("ようこそ。スタートボタンを押してゲームを始めてください。");


//How to Slides

const howto = document.getElementById("howto");
const slidesEl = document.getElementById("slides");
const prevBtn = document.getElementById("prevSlide");
const nextBtn = document.getElementById("nextSlide");
const closeBtn = document.getElementById("closeHowto");
const dotsEl = document.getElementById("dots");

const totalSlides = slidesEl.children.length;
let currentSlide = 0;

// ドットを生成
function renderDots(){
    dotsEl.innerHTML = "";
    for (let i = 0;i < totalSlides; i++){
        const d = document.createElement("div");
        d.className = "dot" + (i === currentSlide ? " active" : "");
        d.addEventListener("click",()=> goToSlide(i));
        dotsEl.appendChild(d);
    }
}

function openHowto(){
    howto.classList.add("open");
    howto.setAttribute("aria-hidden","false");
    document.body.classList.add("overlay-open");
    renderDots();
    goToSlide(0);
}

function closeHowto(){
    howto.classList.remove("open");
    howto.setAttribute("aria-hidden","true");
    document.body.classList.remove("overlay-open");
}

function goToSlide(i){
    if (i < 0)i=0;
    if (i >= totalSlides) i = totalSlides - 1;

    currentSlide = i;
    const tx = -i * 100;
    slidesEl.style.transform = `translateX(${tx}%)`;
    for (let s = 0; s < totalSlides; s++){
        slidesEl.children[s].setAttribute("aria-hidden", s === i? "false" : "true");
    }
    renderDots();
}

prevBtn.addEventListener("click",()=> goToSlide(currentSlide - 1));
nextBtn.addEventListener("click",()=> goToSlide(currentSlide + 1));
closeBtn.addEventListener("click",closeHowto);
howtoBtn.addEventListener("click",openHowto);

document.addEventListener("keydown",(e)=>{
    if (howto.classList.contains("open")){
        if (e.key === "ArrowLeft"){
            goToSlide(currentSlide - 1);
            e.preventDefault();
        }
        else if (e.key === "ArrowRight"){
            goToSlide(currentSlide + 1);
            e.preventDefault();
        }
        else if (e.key === "Escape"){
            closeHowto();
            e.preventDefault();
        }
    }
    else if (gameOverEl.classList.contains("open")){
        if (e.key === "Escape"){
            hideGameOver();
            e.preventDefault();
        }
    }
});

//finished script.js

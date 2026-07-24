const CHALLENGE_COUNT = 20;
const RANDOM_QUESTION_ORDER = true;
const RANDOM_AB_POSITION = true;


const CORRECT_MESSAGES = [
  "答對！(≧▽≦)",
  "你太棒啦！",
  "太神啦！ヽ(✿ﾟ▽ﾟ)ノ",
  "答對了耶！",
  "這題難不倒你！",
  "給你一個讚！",
  "完全正確！",
  "很不錯喔！",
  "好強！",
  "你是不是偷看答案了？",
  "要開始崇拜你了！"
];

const WRONG_MESSAGES = [
  "答錯！(´･ω･)",
  "搖頭中...",
  "再仔細看看吧！",
  "這題有點可惜",
  "差一點點！",
  "你被套路了",
  "這題很多人都會錯",
  "再挑戰一次！",
  "別灰心，下一題加油！",
  "露出疑惑的表情?"
];


const ENDING_RANGES = [
  { min: 0, max: 4, image: "ending/ending_0_2.png", title: "迷路了蛤?", message: "：你是不是在亂猜？" },
  { min: 5, max: 8, image: "ending/ending_3_4.png", title: "見習挑戰者", message: "：好像有認真看……但不多。" },
  { min: 9, max: 12, image: "ending/ending_5_6.png", title: "合格的挑戰者", message: "：已經有及格了！" },
  { min: 13, max: 16, image: "ending/ending_7_8.png", title: "挑戰達人", message: "：你很厲害耶！" },
  { min: 17, max: 19, image: "ending/ending_9.png", title: "傳說級挑戰者", message: "：只差一點就滿分！" },
  { min: 20, max: 20, image: "ending/ending_10.png", title: "超級大師", message: "：太誇張了吧！全部答對！" }
];

let allQuestions = [];
let questions = [];
let currentIndex = 0;
let correctCount = 0;
let answerVisible = false;
let waitingNextQuestion = false;
let answeredCurrentQuestion = false;

const startScreen = document.getElementById("startScreen");
const quizScreen = document.getElementById("quizScreen");
const endingScreen = document.getElementById("endingScreen");
const endingImage = document.getElementById("endingImage");

const quizSelect = document.getElementById("quizSelect");
const loadQuizButton = document.getElementById("loadQuizButton");
const startButton = document.getElementById("startButton");
const loadedInfo = document.getElementById("loadedInfo");
const challengeCountInput = document.getElementById("challengeCountInput");

const app = document.getElementById("app");
const questionNumber = document.getElementById("questionNumber");
const scoreMini = document.getElementById("scoreMini");
const questionText = document.getElementById("questionText");
const questionImageBox = document.getElementById("questionImageBox");
const questionImage = document.getElementById("questionImage");
const optionA = document.getElementById("optionA");
const optionB = document.getElementById("optionB");
const nameA = document.getElementById("nameA");
const nameB = document.getElementById("nameB");
const cardA = document.getElementById("cardA");
const cardB = document.getElementById("cardB");
const inputAnswerBox = document.getElementById("inputAnswerBox");
const answerInput = document.getElementById("answerInput");
const submitAnswerButton = document.getElementById("submitAnswerButton");
const inputAnswerHint = document.getElementById("inputAnswerHint");
const resultBanner = document.getElementById("resultBanner");
const explanationText = document.getElementById("explanationText");
const endingTitle = document.getElementById("endingTitle");
const finalScore = document.getElementById("finalScore");
const endingMessage = document.getElementById("endingMessage");

cardA.addEventListener("click", (event) => chooseAnswer("A", event));
cardB.addEventListener("click", (event) => chooseAnswer("B", event));
if (submitAnswerButton) submitAnswerButton.addEventListener("click", submitInputAnswer);
if (answerInput) {
  answerInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") submitInputAnswer(event);
  });
}
document.getElementById("toggleAnswerButton").addEventListener("click", toggleAnswer);
document.getElementById("nextButton").addEventListener("click", nextQuestion);
document.getElementById("backButton").addEventListener("click", backToStart);
startButton.addEventListener("click", startChallenge);
endingScreen.addEventListener("click", backToStart);

loadQuizButton.addEventListener("click", loadSelectedQuiz);
quizSelect.addEventListener("change", () => {
  if (quizSelect.value) {
    loadSelectedQuiz();
  }
});

async function loadSelectedQuiz() {
  const csvPath = quizSelect.value;

  if (!csvPath) {
    showStartError("請先選擇一個題庫");
    return;
  }

  loadQuizButton.disabled = true;
  startButton.disabled = true;
  loadedInfo.textContent = "題庫載入中……";

  removeStartError();

  try {
    const response = await fetch(encodeURI(csvPath), {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(
        `題庫下載失敗，HTTP 狀態：${response.status}`
      );
    }

    const csvText = await response.text();
    const parsed = parseCSV(csvText);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("CSV 裡面沒有可使用的題目");
    }

    allQuestions = parsed;

    loadedInfo.textContent =
      `已載入 ${allQuestions.length} 題，請設定挑戰題數。`;

    startButton.disabled = false;
  } catch (error) {
    console.error("載入題庫失敗：", error);

    allQuestions = [];
    startButton.disabled = true;
    loadedInfo.textContent = "題庫載入失敗。";

    showStartError(
      `無法載入題庫：${error.message}。請確認 GitHub 上的路徑和檔名。`
    );
  } finally {
    loadQuizButton.disabled = false;
  }
}

function getChallengeCount() {
  const requested = Number(challengeCountInput ? challengeCountInput.value : CHALLENGE_COUNT);

  if (!Number.isFinite(requested) || requested < 1) {
    return Math.min(CHALLENGE_COUNT, allQuestions.length);
  }

  return Math.min(Math.floor(requested), allQuestions.length);
}

function startChallenge() {
  if (!allQuestions.length) {
   showStartError("請先選擇並載入題庫");
   return;
 }

  const count = getChallengeCount();
  const pool = RANDOM_QUESTION_ORDER ? shuffleArray(allQuestions) : [...allQuestions];
  questions = pool.slice(0, count);

  if (RANDOM_AB_POSITION) {
    questions = questions.map(randomizeAB);
  }

  currentIndex = 0;
  correctCount = 0;
  showOnly(quizScreen);
  loadQuestion();
}

function loadQuestion() {
  if (currentIndex >= questions.length) {
    showEnding();
    return;
  }

  const q = questions[currentIndex];

  answerVisible = false;
  waitingNextQuestion = false;
  answeredCurrentQuestion = false;

  app.classList.remove("show-answer", "waiting-next");
  resultBanner.className = "result-banner";
  resultBanner.textContent = "";

  questionNumber.textContent = `第 ${currentIndex + 1} 題`;
  scoreMini.textContent = `目前答對：${correctCount}`;
  questionText.textContent = q.question || "哪一個是真的呢?";
  renderQuestionImage(q.questionImage);

  const explanation = (q.explanation || "").trim();
  explanationText.textContent = explanation;
  explanationText.style.display = explanation ? "" : "none";

  if (isInputQuestion(q)) {
    showInputQuestion(q);
  } else {
    showChoiceQuestion(q);
  }

  resetCards();
  setCorrectCard(q.correct);
}

function isInputQuestion(q) {
  const type = String(q.type || "").toLowerCase();
  return type === "input" || type === "input_retry" || Boolean(q.answerText);
}

function isRetryInputQuestion(q) {
  return String(q.type || "").toLowerCase() === "input_retry";
}

function showChoiceQuestion(q) {
  document.querySelector(".cards").classList.remove("hidden");
  if (inputAnswerBox) inputAnswerBox.classList.add("hidden");

  nameA.textContent = q.nameA || "版本 A";
  nameB.textContent = q.nameB || "版本 B";

  renderOption(optionA, q.imageA, q.textA, "A 選項");
  renderOption(optionB, q.imageB, q.textB, "B 選項");
}

function showInputQuestion(q) {
  document.querySelector(".cards").classList.add("hidden");
  if (inputAnswerBox) inputAnswerBox.classList.remove("hidden");

  if (answerInput) {
    answerInput.value = "";
    answerInput.disabled = false;
    setTimeout(() => answerInput.focus(), 0);
  }

  if (submitAnswerButton) submitAnswerButton.disabled = false;
  if (inputAnswerHint) inputAnswerHint.textContent = "請輸入答案後按 Enter 或送出";

  cardA.classList.remove("correct", "wrong");
  cardB.classList.remove("correct", "wrong");
}

function normalizeAnswerText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[，。！？、,.!?]/g, "");
}

function getAcceptedAnswers(q) {
  const raw = q.answerText || q.answer || "";
  return String(raw)
    .split("|")
    .map(normalizeAnswerText)
    .filter(Boolean);
}

function submitInputAnswer(event) {
  if (event) event.stopPropagation();
  if (currentIndex >= questions.length || answeredCurrentQuestion) return;

  const q = questions[currentIndex];
  if (!isInputQuestion(q)) return;

  const userAnswer = normalizeAnswerText(answerInput ? answerInput.value : "");
  const acceptedAnswers = getAcceptedAnswers(q);

  if (!userAnswer) {
    if (inputAnswerHint) inputAnswerHint.textContent = "請先輸入答案";
    return;
  }

  const isCorrect = acceptedAnswers.includes(userAnswer);

  if (!isCorrect && isRetryInputQuestion(q)) {
    resultBanner.className = "result-banner wrong-result";
    resultBanner.textContent = "還不對，再試一次！";
    if (inputAnswerHint) inputAnswerHint.textContent = "再想一下，答對才會進入下一題";
    if (answerInput) {
      answerInput.disabled = false;
      answerInput.focus();
      answerInput.select();
    }
    if (submitAnswerButton) submitAnswerButton.disabled = false;
    waitingNextQuestion = false;
    app.classList.remove("waiting-next", "show-answer");
    return;
  }

  answeredCurrentQuestion = true;

  if (isCorrect) correctCount++;

  scoreMini.textContent = `目前答對：${correctCount}`;
  app.classList.add("show-answer", "waiting-next");
  answerVisible = true;
  waitingNextQuestion = true;

  if (answerInput) answerInput.disabled = true;
  if (submitAnswerButton) submitAnswerButton.disabled = true;

  const displayAnswer = q.answerText || q.answer || "";

  if (isCorrect) {
    resultBanner.className = "result-banner correct-result";
    resultBanner.textContent = randomMessage(CORRECT_MESSAGES);
    if (inputAnswerHint) inputAnswerHint.textContent = `正解：${displayAnswer}`;
  } else {
    resultBanner.className = "result-banner wrong-result";
    resultBanner.textContent = randomMessage(WRONG_MESSAGES);
    if (inputAnswerHint) inputAnswerHint.textContent = `正解：${displayAnswer}`;
  }
}

function chooseAnswer(choice, event) {
  if (event) event.stopPropagation();
  if (currentIndex >= questions.length || answeredCurrentQuestion) return;

  answeredCurrentQuestion = true;

  const pickedAnswer = String(choice).toUpperCase();
  const correct = String(questions[currentIndex].correct || "").toUpperCase();
  const isCorrect = pickedAnswer === correct;

  if (isCorrect) correctCount++;

  scoreMini.textContent = `目前答對：${correctCount}`;
  app.classList.add("show-answer", "waiting-next");
  answerVisible = true;
  waitingNextQuestion = true;

  cardA.classList.remove("picked-correct", "picked-wrong");
  cardB.classList.remove("picked-correct", "picked-wrong");

  const pickedCard = pickedAnswer === "A" ? cardA : cardB;
  const pickedBadge = pickedCard.querySelector(".pick-badge");

  if (isCorrect) {
    pickedCard.classList.add("picked-correct");
    pickedBadge.textContent = "答對！";
    resultBanner.className = "result-banner correct-result";
    resultBanner.textContent = randomMessage(CORRECT_MESSAGES);
  } else {
    pickedCard.classList.add("picked-wrong");
    pickedBadge.textContent = "答錯！";
    resultBanner.className = "result-banner wrong-result";
    resultBanner.textContent = randomMessage(WRONG_MESSAGES);
  }
}

function showEnding() {
  const ending = getEndingByScore(correctCount);
  endingScreen.classList.remove("use-image");

  endingTitle.textContent = ending.title;
  const accuracy = Math.round((correctCount / questions.length) * 100);

  finalScore.textContent =
  `答對 ${correctCount} / ${questions.length} 題（${accuracy}%）`;
  endingMessage.textContent = ending.message + "｜點一下回到開始畫面";

  endingImage.src = ending.image;

  showOnly(endingScreen);
}

function getEndingByScore(score) {
  const total = questions.length || CHALLENGE_COUNT;
  const normalizedScore = Math.round((score / total) * CHALLENGE_COUNT);
  return ENDING_RANGES.find(item => normalizedScore >= item.min && normalizedScore <= item.max) || ENDING_RANGES[0];
}

function renderQuestionImage(src) {
  if (!questionImageBox || !questionImage) return;

  if (src) {
    questionImage.src = src;
    questionImageBox.style.display = "flex";
    questionImage.onerror = () => {
      questionImageBox.innerHTML = `<div class="placeholder">找不到題目圖片<br>${src}</div>`;
    };
  } else {
    questionImage.src = "";
    questionImageBox.style.display = "none";
  }
}

function renderOption(container, imageSrc, textValue, fallbackText) {
  container.innerHTML = "";

  if (imageSrc) {
    const img = document.createElement("img");
    img.src = imageSrc;
    img.alt = fallbackText;
    img.onerror = () => {
      container.innerHTML = `<div class="placeholder">找不到圖片<br>${imageSrc}</div>`;
    };
    container.appendChild(img);
    return;
  }

  if (textValue) {
    container.innerHTML = `<div class="text-option">${escapeHTML(textValue)}</div>`;
    return;
  }

  container.innerHTML = `<div class="placeholder">${fallbackText}</div>`;
}

function escapeHTML(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function resetCards() {
  for (const card of [cardA, cardB]) {
    card.classList.remove("correct", "wrong", "picked-correct", "picked-wrong");
    card.querySelector(".pick-badge").textContent = "答對！";
  }
}

function setCorrectCard(correct) {
  const normalized = String(correct || "").trim().toUpperCase();

  if (normalized === "A") {
    cardA.classList.add("correct");
    cardB.classList.add("wrong");
  }

  if (normalized === "B") {
    cardB.classList.add("correct");
    cardA.classList.add("wrong");
  }
}

function toggleAnswer() {
  if (currentIndex >= questions.length) return;

  const q = questions[currentIndex];

  if (isInputQuestion(q)) {
    answerVisible = !answerVisible;
    app.classList.toggle("show-answer", answerVisible);

    if (answerVisible) {
      if (inputAnswerHint) inputAnswerHint.textContent = `正解：${q.answerText || q.answer || ""}`;
    } else {
      if (inputAnswerHint) inputAnswerHint.textContent = "請輸入答案後按 Enter 或送出";
      resultBanner.className = "result-banner";
      resultBanner.textContent = "";
    }
    return;
  }

  answerVisible = !answerVisible;
  app.classList.toggle("show-answer", answerVisible);

  if (!answerVisible) {
    waitingNextQuestion = false;
    app.classList.remove("waiting-next");
    cardA.classList.remove("picked-correct", "picked-wrong");
    cardB.classList.remove("picked-correct", "picked-wrong");
    resultBanner.className = "result-banner";
    resultBanner.textContent = "";
  }
}

function nextQuestion() {
  currentIndex++;
  loadQuestion();
}

function backToStart() {
  waitingNextQuestion = false;
  answerVisible = false;
  answeredCurrentQuestion = false;
  app.classList.remove("show-answer", "waiting-next");
  showOnly(startScreen);
}

function showOnly(screen) {
  startScreen.classList.add("hidden");
  quizScreen.classList.add("hidden");
  endingScreen.classList.add("hidden");
  screen.classList.remove("hidden");
}

function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentValue = "";
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      currentValue += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      currentRow.push(currentValue);
      currentValue = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") i++;
      currentRow.push(currentValue);
      if (currentRow.some((cell) => cell.trim() !== "")) rows.push(currentRow);
      currentRow = [];
      currentValue = "";
    } else {
      currentValue += char;
    }
  }

  currentRow.push(currentValue);
  if (currentRow.some((cell) => cell.trim() !== "")) rows.push(currentRow);

  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.trim().replace(/^\uFEFF/, ""));

  if (!headers.includes("question")) {
    throw new Error("CSV 缺少必要欄位：question");
  }

  const hasChoiceFields = headers.includes("textA") || headers.includes("textB") || headers.includes("imageA") || headers.includes("imageB");
  const hasInputFields = headers.includes("answerText") || headers.includes("answer");

  if (!hasChoiceFields && !hasInputFields) {
    throw new Error("CSV 至少需要二選一欄位 textA/textB 或輸入題欄位 answerText");
  }

  return rows
    .slice(1)
    .map((row) => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = (row[index] || "").trim();
      });

      return {
        type: item.type || "",
        question: item.question || "正解是什麼呢?",
        questionImage: item.questionImage || "",
        nameA: item.nameA || "版本 A",
        nameB: item.nameB || "版本 B",
        imageA: item.imageA || "",
        imageB: item.imageB || "",
        textA: item.textA || "",
        textB: item.textB || "",
        correct: String(item.correct || "").toUpperCase(),
        answerText: item.answerText || item.answer || "",
        explanation: item.explanation || "",
      };
    })
    .filter((q) => {
      if (isInputQuestion(q)) {
        return Boolean(q.question && getAcceptedAnswers(q).length > 0);
      }

      const hasA = q.imageA || q.textA;
      const hasB = q.imageB || q.textB;
      return hasA && hasB && ["A", "B"].includes(q.correct);
    });
}

function showStartError(message) {
  removeStartError();

  const box = document.querySelector(".start-panel");
  const error = document.createElement("div");
  error.className = "error-box";
  error.innerHTML = `<strong>錯誤：</strong>${message}`;
  box.appendChild(error);
}

function removeStartError() {
  const oldError = document.querySelector(".error-box");
  if (oldError) oldError.remove();
}

function shuffleArray(array) {
  const arr = [...array];

  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  return arr;
}

function randomizeAB(question) {
  const q = { ...question };

  if (isInputQuestion(q)) return q;

  if (Math.random() < 0.5) {
    [q.imageA, q.imageB] = [q.imageB, q.imageA];
    [q.textA, q.textB] = [q.textB, q.textA];
    [q.nameA, q.nameB] = [q.nameB, q.nameA];
    q.correct = String(q.correct).toUpperCase() === "A" ? "B" : "A";
  }

  return q;
}

function randomMessage(list) {
  return list[Math.floor(Math.random() * list.length)];
}

document.addEventListener("click", (event) => {
  if (quizScreen.classList.contains("hidden")) return;

  const clickedCard = event.target.closest(".card");
  const clickedButton = event.target.closest("button");

  if (clickedCard || clickedButton) return;

  if (waitingNextQuestion) {
    waitingNextQuestion = false;
    nextQuestion();
  }
});

document.addEventListener("keydown", (event) => {
  if (quizScreen.classList.contains("hidden")) return;
  if (event.target && event.target.id === "answerInput") return;

  const key = event.key.toLowerCase();

  if (event.code === "Space") {
    event.preventDefault();

    if (waitingNextQuestion) {
      waitingNextQuestion = false;
      nextQuestion();
    } else {
      toggleAnswer();
    }
  }

  if (event.code === "ArrowRight") nextQuestion();
  if (key === "a") chooseAnswer("A", event);
  if (key === "b") chooseAnswer("B", event);
  if (key === "r") backToStart();
});

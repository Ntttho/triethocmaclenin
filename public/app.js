// Triet Hoc Mac - Lenin Quiz Web Application Logic

let appState = {
  currentTab: 'home',
  questions: [],
  currentIndex: 0,
  userAnswers: {}, // questionId -> selectedOptionId
  flaggedQuestions: new Set(),
  practiceRevealed: new Set(),
  mode: 'practice',
  topic: 'ALL',
  totalCount: '40',
  shuffle: true,
  timerInterval: null,
  timeSpentSeconds: 0,
  timeRemainingSeconds: 45 * 60,
  lastResult: null,
  currentReviewFilter: 'all'
};

// ----------------- THEME INITIALIZATION -----------------
function initTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  const isDark = localStorage.getItem('theme') === 'dark' || 
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  themeToggle.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    const newDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', newDark ? 'dark' : 'light');
  });
}

// ----------------- NAVIGATION -----------------
function navigateTab(tabName) {
  appState.currentTab = tabName;
  ['home', 'quiz', 'result', 'bank', 'history'].forEach(tab => {
    const el = document.getElementById(`view-${tab}`);
    if (el) {
      if (tab === tabName) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }
  });

  // Update header buttons styling
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.classList.remove('text-red-600', 'dark:text-red-400', 'bg-red-50', 'dark:bg-red-950/40');
    btn.classList.add('text-slate-600', 'dark:text-slate-400');
  });
  const activeNav = document.getElementById(`nav-btn-${tabName}`);
  if (activeNav) {
    activeNav.classList.remove('text-slate-600', 'dark:text-slate-400');
    activeNav.classList.add('text-red-600', 'dark:text-red-400', 'bg-red-50', 'dark:bg-red-950/40');
  }

  if (tabName === 'bank') {
    loadQuestionBank();
  } else if (tabName === 'history') {
    loadHistory();
  }
}

// ----------------- SETUP TAB HELPERS -----------------
function setCount(val) {
  document.getElementById('selected-count').value = val;
  document.querySelectorAll('.count-btn').forEach(btn => {
    btn.classList.remove('border-2', 'border-red-500', 'bg-red-50', 'dark:bg-red-950/40', 'text-red-600', 'dark:text-red-400');
    btn.classList.add('border-slate-200', 'dark:border-slate-700');
  });
  event.target.classList.add('border-2', 'border-red-500', 'bg-red-50', 'dark:bg-red-950/40', 'text-red-600', 'dark:text-red-400');
  event.target.classList.remove('border-slate-200', 'dark:border-slate-700');
}

// Handle radio borders on topic selection
document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  document.querySelectorAll('input[name="quiz-topic"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.topic-radio-label').forEach(lbl => {
        lbl.classList.remove('border-red-500', 'bg-red-50/50', 'dark:bg-red-950/20');
        lbl.classList.add('border-slate-200', 'dark:border-slate-700');
      });
      radio.closest('label').classList.add('border-red-500', 'bg-red-50/50', 'dark:bg-red-950/20');
      radio.closest('label').classList.remove('border-slate-200', 'dark:border-slate-700');
    });
  });

  document.querySelectorAll('input[name="quiz-mode"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.mode-radio-label').forEach(lbl => {
        lbl.classList.remove('border-red-500', 'bg-red-50/50', 'dark:bg-red-950/20');
        lbl.classList.add('border-slate-200', 'dark:border-slate-700');
      });
      radio.closest('label').classList.add('border-red-500', 'bg-red-50/50', 'dark:bg-red-950/20');
      radio.closest('label').classList.remove('border-slate-200', 'dark:border-slate-700');
    });
  });

  // Keyboard navigation shortcuts
  window.addEventListener('keydown', (e) => {
    if (appState.currentTab !== 'quiz') return;
    if (e.key === 'ArrowLeft') {
      goToPrevQuestion();
    } else if (e.key === 'ArrowRight') {
      goToNextQuestion();
    } else if (['1', '2', '3', '4'].includes(e.key)) {
      const idx = parseInt(e.key, 10) - 1;
      const currentQ = appState.questions[appState.currentIndex];
      if (currentQ && currentQ.options[idx]) {
        selectOption(currentQ.options[idx].id);
      }
    }
  });
});

// ----------------- START QUIZ -----------------
async function startQuiz() {
  const topic = document.querySelector('input[name="quiz-topic"]:checked').value;
  const mode = document.querySelector('input[name="quiz-mode"]:checked').value;
  const count = document.getElementById('selected-count').value;
  const shuffle = document.getElementById('shuffle-toggle').checked;

  const btnStart = document.getElementById('btn-start-quiz');
  btnStart.disabled = true;
  btnStart.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang tải câu hỏi...`;

  try {
    const url = `/api/quiz?topic=${topic}&count=${count}&mode=${mode}&shuffle=${shuffle}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!data.success || !data.questions.length) {
      alert('Không tìm thấy câu hỏi phù hợp. Vui lòng thử lại!');
      return;
    }

    // Reset Quiz State
    appState.questions = data.questions;
    appState.currentIndex = 0;
    appState.userAnswers = {};
    appState.flaggedQuestions = new Set();
    appState.practiceRevealed = new Set();
    appState.mode = mode;
    appState.topic = topic;
    appState.totalCount = data.questions.length;
    appState.timeSpentSeconds = 0;

    // Time calculation (e.g., 45 minutes for 40 questions, ~1 min/question)
    appState.timeRemainingSeconds = Math.max(appState.questions.length * 65, 15 * 60);

    // Switch view to quiz
    navigateTab('quiz');

    // Setup and render
    renderPalette();
    renderCurrentQuestion();
    startTimer();

  } catch (err) {
    console.error('Lỗi khởi tạo đề thi:', err);
    alert('Không thể kết nối đến máy chủ. Hãy kiểm tra kết nối!');
  } finally {
    btnStart.disabled = false;
    btnStart.innerHTML = `<i class="fa-solid fa-play"></i> Bắt Đầu Làm Bài Ngay`;
  }
}

// ----------------- TIMER -----------------
function startTimer() {
  clearInterval(appState.timerInterval);
  const timerEl = document.getElementById('quiz-timer');

  const updateTimerDisplay = () => {
    let displaySeconds = appState.mode === 'exam' ? appState.timeRemainingSeconds : appState.timeSpentSeconds;
    const mins = Math.floor(displaySeconds / 60);
    const secs = displaySeconds % 60;
    timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    if (appState.mode === 'exam' && appState.timeRemainingSeconds <= 300) {
      timerEl.parentElement.classList.add('text-red-500', 'border-red-500');
    } else {
      timerEl.parentElement.classList.remove('text-red-500', 'border-red-500');
    }
  };

  updateTimerDisplay();

  appState.timerInterval = setInterval(() => {
    appState.timeSpentSeconds++;
    if (appState.mode === 'exam') {
      appState.timeRemainingSeconds--;
      if (appState.timeRemainingSeconds <= 0) {
        clearInterval(appState.timerInterval);
        alert('Hết giờ làm bài thi! Hệ thống sẽ tự động nộp bài.');
        submitQuiz(true);
        return;
      }
    }
    updateTimerDisplay();
  }, 1000);
}

// ----------------- RENDER QUESTION -----------------
function renderCurrentQuestion() {
  const q = appState.questions[appState.currentIndex];
  if (!q) return;

  // Header badges
  document.getElementById('q-index-badge').textContent = `Câu ${appState.currentIndex + 1} / ${appState.questions.length}`;
  document.getElementById('q-topic-badge').textContent = q.topicTitle || (q.topic_id === 1 ? 'Bộ đề 1' : 'Bộ đề 2');

  // Question content
  document.getElementById('q-content').textContent = q.content;

  // Flag button
  const flagBtn = document.getElementById('q-flag-btn');
  const isFlagged = appState.flaggedQuestions.has(q.id);
  if (isFlagged) {
    flagBtn.className = 'px-3 py-1 rounded-xl text-xs font-bold border border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 transition flex items-center gap-1.5';
    flagBtn.innerHTML = `<i class="fa-solid fa-bookmark"></i> Đã gắn cờ`;
  } else {
    flagBtn.className = 'px-3 py-1 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-amber-500 transition flex items-center gap-1.5';
    flagBtn.innerHTML = `<i class="fa-regular fa-bookmark"></i> Gắn cờ xem lại`;
  }

  // Options rendering
  const optionsContainer = document.getElementById('q-options');
  optionsContainer.innerHTML = '';

  const selectedOptId = appState.userAnswers[q.id];
  const isRevealed = appState.mode === 'practice' && appState.practiceRevealed.has(q.id);

  q.options.forEach((opt, idx) => {
    const isSelected = selectedOptId === opt.id;
    const btn = document.createElement('div');
    
    let baseClass = 'option-btn p-4 rounded-2xl border-2 font-medium flex items-start gap-3 ';
    
    if (isRevealed) {
      if (opt.isCorrect) {
        baseClass += 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-bold';
      } else if (isSelected && !opt.isCorrect) {
        baseClass += 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 font-bold';
      } else {
        baseClass += 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 opacity-60';
      }
    } else {
      if (isSelected) {
        baseClass += 'selected border-red-500 bg-red-50/50 dark:bg-red-950/20 text-slate-900 dark:text-white font-bold';
      } else {
        baseClass += 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-slate-200';
      }
    }

    btn.className = baseClass;
    btn.onclick = () => selectOption(opt.id);

    // Option letter badge
    let badgeClass = 'w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ';
    if (isRevealed && opt.isCorrect) {
      badgeClass += 'bg-emerald-500 text-white';
    } else if (isRevealed && isSelected && !opt.isCorrect) {
      badgeClass += 'bg-red-500 text-white';
    } else if (isSelected) {
      badgeClass += 'bg-red-600 text-white';
    } else {
      badgeClass += 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
    }

    let statusIcon = '';
    if (isRevealed) {
      if (opt.isCorrect) {
        statusIcon = '<i class="fa-solid fa-circle-check text-emerald-500 text-lg ml-auto shrink-0"></i>';
      } else if (isSelected && !opt.isCorrect) {
        statusIcon = '<i class="fa-solid fa-circle-xmark text-red-500 text-lg ml-auto shrink-0"></i>';
      }
    }

    btn.innerHTML = `
      <div class="${badgeClass}">${opt.displayLabel || String.fromCharCode(65 + idx)}</div>
      <div class="text-sm sm:text-base leading-snug flex-1">${opt.content}</div>
      ${statusIcon}
    `;

    optionsContainer.appendChild(btn);
  });

  // Practice mode feedback
  const feedbackBox = document.getElementById('practice-feedback');
  if (isRevealed) {
    feedbackBox.classList.remove('hidden');
    const correctOpt = q.options.find(o => o.isCorrect);
    const isUserRight = selectedOptId === correctOpt?.id;

    if (isUserRight) {
      feedbackBox.className = 'mt-6 p-4 rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-sm';
      feedbackBox.innerHTML = `
        <div class="flex items-center gap-2 font-bold mb-1">
          <i class="fa-solid fa-circle-check text-emerald-600"></i> Chính xác! Chúc mừng bạn.
        </div>
        <div>Đáp án đúng là: <strong>${correctOpt ? correctOpt.displayLabel + '. ' + correctOpt.content : ''}</strong></div>
      `;
    } else {
      feedbackBox.className = 'mt-6 p-4 rounded-2xl border border-red-300 dark:border-red-800 bg-red-50/80 dark:bg-red-950/40 text-red-800 dark:text-red-200 text-sm';
      feedbackBox.innerHTML = `
        <div class="flex items-center gap-2 font-bold mb-1">
          <i class="fa-solid fa-circle-xmark text-red-600"></i> Chưa chính xác!
        </div>
        <div>Đáp án đúng phải là: <strong class="text-emerald-700 dark:text-emerald-300">${correctOpt ? correctOpt.displayLabel + '. ' + correctOpt.content : ''}</strong></div>
      `;
    }
  } else {
    feedbackBox.classList.add('hidden');
  }

  // Update Prev/Next button disabled states
  document.getElementById('btn-prev-q').disabled = appState.currentIndex === 0;
  document.getElementById('btn-prev-q').classList.toggle('opacity-40', appState.currentIndex === 0);

  // Update top progress text and bar
  const total = appState.questions.length;
  const current = appState.currentIndex + 1;
  const answeredCount = Object.keys(appState.userAnswers).length;

  document.getElementById('quiz-progress-text').textContent = `Câu ${current} / ${total}`;
  document.getElementById('quiz-answered-text').textContent = `Đã trả lời: ${answeredCount}/${total}`;
  document.getElementById('quiz-progress-bar').style.width = `${(current / total) * 100}%`;

  // Update active state in palette
  updatePaletteStates();
}

// ----------------- SELECT OPTION -----------------
function selectOption(optionId) {
  const q = appState.questions[appState.currentIndex];
  if (!q) return;

  appState.userAnswers[q.id] = optionId;

  if (appState.mode === 'practice') {
    appState.practiceRevealed.add(q.id);
  }

  renderCurrentQuestion();
  updatePaletteStates();
}

// ----------------- FLAG TOGGLE -----------------
function toggleFlagCurrentQuestion() {
  const q = appState.questions[appState.currentIndex];
  if (!q) return;

  if (appState.flaggedQuestions.has(q.id)) {
    appState.flaggedQuestions.delete(q.id);
  } else {
    appState.flaggedQuestions.add(q.id);
  }

  renderCurrentQuestion();
  updatePaletteStates();
}

// ----------------- PREV / NEXT -----------------
function goToPrevQuestion() {
  if (appState.currentIndex > 0) {
    appState.currentIndex--;
    renderCurrentQuestion();
  }
}

function goToNextQuestion() {
  if (appState.currentIndex < appState.questions.length - 1) {
    appState.currentIndex++;
    renderCurrentQuestion();
  }
}

function jumpToQuestion(index) {
  if (index >= 0 && index < appState.questions.length) {
    appState.currentIndex = index;
    renderCurrentQuestion();
  }
}

// ----------------- PALETTE -----------------
function renderPalette() {
  const grid = document.getElementById('palette-grid');
  grid.innerHTML = '';
  document.getElementById('palette-count').textContent = `${appState.questions.length} câu`;

  appState.questions.forEach((q, idx) => {
    const btn = document.createElement('button');
    btn.id = `palette-btn-${idx}`;
    btn.textContent = idx + 1;
    btn.className = 'palette-btn h-9 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold transition flex items-center justify-center';
    btn.onclick = () => jumpToQuestion(idx);
    grid.appendChild(btn);
  });

  updatePaletteStates();
}

function updatePaletteStates() {
  appState.questions.forEach((q, idx) => {
    const btn = document.getElementById(`palette-btn-${idx}`);
    if (!btn) return;

    const isCurrent = idx === appState.currentIndex;
    const isAnswered = Boolean(appState.userAnswers[q.id]);
    const isFlagged = appState.flaggedQuestions.has(q.id);

    btn.className = 'palette-btn h-9 rounded-xl text-xs font-bold transition flex items-center justify-center relative ';

    if (isAnswered) {
      btn.className += 'bg-red-600 text-white border-2 border-red-700 ';
    } else {
      btn.className += 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 ';
    }

    if (isCurrent) {
      btn.className += 'ring-2 ring-amber-400 font-black scale-105 shadow-sm ';
    }

    if (isFlagged) {
      btn.className += 'ring-2 ring-amber-500 ';
    }
  });
}

// ----------------- SUBMIT QUIZ -----------------
async function submitQuiz(force = false) {
  const answeredCount = Object.keys(appState.userAnswers).length;
  const total = appState.questions.length;

  if (!force && answeredCount < total) {
    const unanswered = total - answeredCount;
    const confirmSubmit = confirm(`Bạn còn ${unanswered} câu chưa trả lời. Bạn có chắc chắn muốn nộp bài không?`);
    if (!confirmSubmit) return;
  } else if (!force) {
    const confirmSubmit = confirm(`Bạn đã trả lời hết ${total} câu. Bạn có muốn nộp bài chấm điểm ngay không?`);
    if (!confirmSubmit) return;
  }

  clearInterval(appState.timerInterval);

  // Prepare submission payload
  const answersPayload = appState.questions.map(q => ({
    questionId: q.id,
    selectedOptionId: appState.userAnswers[q.id] || null
  }));

  try {
    const res = await fetch('/api/quiz/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: 'Sinh viên ôn thi',
        mode: appState.mode,
        topicCode: appState.topic,
        timeSpentSeconds: appState.timeSpentSeconds,
        answers: answersPayload
      })
    });

    const data = await res.json();
    if (!data.success) {
      alert('Có lỗi xảy ra khi chấm điểm: ' + data.message);
      return;
    }

    appState.lastResult = data;
    renderResult(data);
    navigateTab('result');

  } catch (err) {
    console.error('Lỗi khi nộp bài:', err);
    alert('Không thể gửi bài thi lên máy chủ.');
  }
}

function confirmExitQuiz() {
  if (confirm('Bạn có chắc chắn muốn thoát bài thi hiện tại không? Tiến độ làm bài sẽ không được lưu.')) {
    clearInterval(appState.timerInterval);
    navigateTab('home');
  }
}

// ----------------- RENDER RESULT -----------------
function renderResult(data) {
  document.getElementById('res-score').textContent = Number(data.score).toFixed(2);
  document.getElementById('res-correct').textContent = `${data.correctCount}/${data.totalQuestions}`;
  document.getElementById('res-percent').textContent = `${data.percentage}%`;

  const mins = Math.floor(data.timeSpentSeconds / 60);
  const secs = data.timeSpentSeconds % 60;
  document.getElementById('res-time').textContent = `${mins}m ${secs}s`;

  const wrongCount = data.totalQuestions - data.correctCount;
  document.getElementById('wrong-count-badge').textContent = wrongCount;

  // Title comment
  const titleEl = document.getElementById('result-title');
  const commentEl = document.getElementById('result-comment');
  const iconEl = document.getElementById('result-badge-icon');

  if (data.score >= 8.5) {
    titleEl.textContent = 'Xuất Sắc! Điểm Tuyệt Đối!';
    commentEl.textContent = 'Bạn đã nắm rất vững kiến thức Triết học Mác - Lênin. Tự tin bước vào phòng thi nhé!';
    iconEl.className = 'w-20 h-20 mx-auto rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center text-4xl mb-4 shadow-lg shadow-emerald-500/20';
    iconEl.innerHTML = '<i class="fa-solid fa-trophy"></i>';
  } else if (data.score >= 6.5) {
    titleEl.textContent = 'Khá Tốt! Tiếp Tục Phát Huy!';
    commentEl.textContent = 'Bạn đã đạt điểm an toàn. Hãy xem lại các câu làm sai bên dưới để tối ưu điểm số nhé.';
    iconEl.className = 'w-20 h-20 mx-auto rounded-3xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center text-4xl mb-4 shadow-lg shadow-blue-500/20';
    iconEl.innerHTML = '<i class="fa-solid fa-medal"></i>';
  } else {
    titleEl.textContent = 'Cần Ôn Tập Thêm!';
    commentEl.textContent = 'Hãy tập trung làm lại những câu sai và đọc ngân hàng câu hỏi để củng cố lại lý thuyết.';
    iconEl.className = 'w-20 h-20 mx-auto rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center text-4xl mb-4 shadow-lg shadow-amber-500/20';
    iconEl.innerHTML = '<i class="fa-solid fa-book-reader"></i>';
  }

  filterReview('all');
}

function filterReview(filterType) {
  appState.currentReviewFilter = filterType;
  if (!appState.lastResult || !appState.lastResult.details) return;

  // Update review tab buttons
  ['all', 'wrong', 'correct'].forEach(f => {
    const btn = document.getElementById(`rev-tab-${f}`);
    if (btn) {
      if (f === filterType) {
        btn.className = 'px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm font-bold';
      } else {
        btn.className = 'px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium';
      }
    }
  });

  const listContainer = document.getElementById('review-list');
  listContainer.innerHTML = '';

  const details = appState.lastResult.details;
  let filtered = details;
  if (filterType === 'wrong') {
    filtered = details.filter(d => !d.isCorrect);
  } else if (filterType === 'correct') {
    filtered = details.filter(d => d.isCorrect);
  }

  if (filtered.length === 0) {
    listContainer.innerHTML = `
      <div class="text-center py-8 text-slate-400">
        <i class="fa-solid fa-circle-check text-3xl text-emerald-500 mb-2"></i>
        <p>Không có câu hỏi nào trong danh mục này.</p>
      </div>
    `;
    return;
  }

  filtered.forEach((d, index) => {
    const card = document.createElement('div');
    card.className = `p-5 rounded-2xl border-2 ${
      d.isCorrect 
        ? 'border-emerald-200 dark:border-emerald-950 bg-emerald-50/20 dark:bg-emerald-950/10' 
        : 'border-rose-200 dark:border-rose-950 bg-rose-50/20 dark:bg-rose-950/10'
    }`;

    let optionsHtml = '';
    d.options.forEach(opt => {
      const isSelected = opt.id === d.selectedOptionId;
      const isCorrectOpt = opt.id === d.correctOptionId;

      let optClass = 'p-3 rounded-xl border text-sm flex items-start gap-2.5 ';
      let badgeClass = 'w-6 h-6 rounded flex items-center justify-center font-bold text-xs shrink-0 ';

      if (isCorrectOpt) {
        optClass += 'border-emerald-500 bg-emerald-100/70 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-100 font-bold';
        badgeClass += 'bg-emerald-600 text-white';
      } else if (isSelected && !isCorrectOpt) {
        optClass += 'border-red-500 bg-red-100/70 dark:bg-red-950/50 text-red-900 dark:text-red-100 font-bold';
        badgeClass += 'bg-red-600 text-white';
      } else {
        optClass += 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 opacity-60';
        badgeClass += 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
      }

      optionsHtml += `
        <div class="${optClass}">
          <div class="${badgeClass}">${opt.label}</div>
          <div class="flex-1">${opt.content}</div>
          ${isCorrectOpt ? '<span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0"><i class="fa-solid fa-check"></i> Đáp án đúng</span>' : ''}
          ${isSelected && !isCorrectOpt ? '<span class="text-xs font-bold text-red-600 dark:text-red-400 shrink-0"><i class="fa-solid fa-xmark"></i> Bạn đã chọn</span>' : ''}
        </div>
      `;
    });

    card.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <span class="text-xs font-extrabold px-2.5 py-1 rounded-full ${d.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}">
          ${d.isCorrect ? '✓ Câu đúng' : '✗ Câu làm sai'}
        </span>
      </div>
      <div class="text-base font-bold text-slate-900 dark:text-white mb-4 leading-relaxed">
        ${d.questionContent}
      </div>
      <div class="space-y-2">
        ${optionsHtml}
      </div>
    `;

    listContainer.appendChild(card);
  });
}

// ----------------- QUESTION BANK (150 QUESTIONS) -----------------
let searchDebounceTimeout = null;
function debounceBankSearch() {
  clearTimeout(searchDebounceTimeout);
  searchDebounceTimeout = setTimeout(loadQuestionBank, 300);
}

async function loadQuestionBank() {
  const topic = document.getElementById('bank-topic-filter').value;
  const search = document.getElementById('bank-search-input').value;
  const listContainer = document.getElementById('bank-list');

  listContainer.innerHTML = `
    <div class="text-center py-10 text-slate-400">
      <i class="fa-solid fa-spinner fa-spin text-2xl mb-2"></i>
      <p>Đang tải dữ liệu từ MySQL...</p>
    </div>
  `;

  try {
    const res = await fetch(`/api/questions/bank?topic=${topic}&search=${encodeURIComponent(search)}`);
    const data = await res.json();

    if (!data.success || data.questions.length === 0) {
      listContainer.innerHTML = `
        <div class="text-center py-12 text-slate-400">
          <i class="fa-solid fa-magnifying-glass text-3xl mb-2"></i>
          <p>Không tìm thấy câu hỏi nào phù hợp với từ khóa.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = '';
    data.questions.forEach((q, idx) => {
      const card = document.createElement('div');
      card.className = 'p-5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-600 transition';

      let optionsHtml = '';
      q.options.forEach(opt => {
        const isCorrect = Boolean(opt.is_correct);
        optionsHtml += `
          <div class="p-2.5 rounded-xl border text-sm flex items-start gap-2.5 ${
            isCorrect 
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 font-bold text-emerald-800 dark:text-emerald-200' 
              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
          }">
            <span class="w-6 h-6 rounded flex items-center justify-center font-bold text-xs shrink-0 ${isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700'}">${opt.label}</span>
            <span class="flex-1">${opt.content}</span>
            ${isCorrect ? '<span class="text-xs font-bold text-emerald-600 shrink-0"><i class="fa-solid fa-check"></i> ĐÚNG</span>' : ''}
          </div>
        `;
      });

      card.innerHTML = `
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs font-bold px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
            Câu ${q.q_num}
          </span>
          <span class="text-xs text-slate-400">(${q.topic_title})</span>
        </div>
        <div class="font-bold text-slate-900 dark:text-white mb-3 text-base leading-snug">
          ${q.content}
        </div>
        <div class="space-y-1.5">
          ${optionsHtml}
        </div>
      `;

      listContainer.appendChild(card);
    });

  } catch (err) {
    console.error('Lỗi tải ngân hàng câu hỏi:', err);
    listContainer.innerHTML = `<p class="text-red-500 text-center py-6">Không thể tải dữ liệu câu hỏi.</p>`;
  }
}

// ----------------- HISTORY (MYSQL LOGS) -----------------
async function loadHistory() {
  const tbody = document.getElementById('history-tbody');
  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="text-center py-8 text-slate-400">
        <i class="fa-solid fa-spinner fa-spin mr-2"></i> Đang tải lịch sử thi...
      </td>
    </tr>
  `;

  try {
    const res = await fetch('/api/attempts');
    const data = await res.json();

    if (!data.success || data.attempts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-8 text-slate-400">
            Chưa có bài thi nào được hoàn thành. Hãy bắt đầu làm bài thi đầu tiên!
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = '';
    data.attempts.forEach(item => {
      const row = document.createElement('tr');
      row.className = 'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition';

      const mins = Math.floor(item.time_spent_seconds / 60);
      const secs = item.time_spent_seconds % 60;
      const dateStr = new Date(item.created_at).toLocaleString('vi-VN');

      row.innerHTML = `
        <td class="px-4 py-3 font-mono font-bold text-xs text-slate-500">#${item.id}</td>
        <td class="px-4 py-3">
          <span class="px-2 py-0.5 rounded text-xs font-bold ${item.mode === 'exam' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}">
            ${item.mode === 'exam' ? 'Thi thử' : 'Luyện tập'}
          </span>
        </td>
        <td class="px-4 py-3 text-xs font-medium">${item.topic_code}</td>
        <td class="px-4 py-3 text-xs font-bold">${item.correct_answers}/${item.total_questions}</td>
        <td class="px-4 py-3 text-sm font-extrabold ${item.score >= 8.0 ? 'text-emerald-600' : item.score >= 5.0 ? 'text-blue-600' : 'text-red-600'}">
          ${Number(item.score).toFixed(2)}
        </td>
        <td class="px-4 py-3 text-xs font-mono text-slate-500">${mins}m ${secs}s</td>
        <td class="px-4 py-3 text-xs text-slate-500">${dateStr}</td>
      `;
      tbody.appendChild(row);
    });

  } catch (err) {
    console.error('Lỗi tải lịch sử:', err);
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-red-500">Lỗi khi tải lịch sử.</td></tr>`;
  }
}


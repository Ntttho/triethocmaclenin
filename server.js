require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Load local fallback JSON questions
let fallbackQuestions = [];
try {
  const jsonPath = path.join(__dirname, 'data', 'questions.json');
  if (fs.existsSync(jsonPath)) {
    fallbackQuestions = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  }
} catch (e) {
  console.warn('Không thể đọc file fallback questions.json:', e.message);
}

// Memory storage for fallback attempts if MySQL is not available
const memoryAttempts = [];

// MySQL Pool setup with Auto-Fallback
let pool = null;
let useMySQL = false;

async function initDatabase() {
  try {
    const config = process.env.DATABASE_URL 
      ? process.env.DATABASE_URL 
      : {
          host: process.env.DB_HOST || 'localhost',
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASS || '1234',
          database: process.env.DB_NAME || 'triet_hoc_quiz',
          port: parseInt(process.env.DB_PORT || '3306', 10),
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
          connectTimeout: 5000,
          charset: 'utf8mb4'
        };

    pool = mysql.createPool(config);
    const conn = await pool.getConnection();
    await conn.query('SELECT 1');
    conn.release();
    useMySQL = true;
    console.log('✅ Đã kết nối thành công với MySQL Database!');
  } catch (err) {
    useMySQL = false;
    console.warn('⚠️ Không kết nối được MySQL. Chuyển sang chế độ Fallback JSON (150 câu hỏi vẫn hoạt động 100%):', err.message);
  }
}

initDatabase();

// Fisher-Yates shuffle
function shuffleArray(arr) {
  const array = [...arr];
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// 1. GET /api/topics
app.get('/api/topics', async (req, res) => {
  if (useMySQL && pool) {
    try {
      const [topics] = await pool.query(`
        SELECT t.id, t.code, t.title, t.description, COUNT(q.id) as question_count
        FROM topics t
        LEFT JOIN questions q ON t.id = q.topic_id
        GROUP BY t.id, t.code, t.title, t.description
      `);
      const [total] = await pool.query('SELECT COUNT(*) as total FROM questions');
      return res.json({ success: true, topics, totalQuestions: total[0].total });
    } catch (e) {
      console.error('MySQL query error, using fallback:', e.message);
    }
  }

  // Fallback
  res.json({
    success: true,
    topics: [
      { id: 1, code: 'ONTAP1', title: 'Bộ đề ôn tập 1 (100 câu)', description: 'Tổng hợp 100 câu hỏi lý thuyết', question_count: 100 },
      { id: 2, code: 'ONTAP2', title: 'Bộ đề ôn tập 2 (50 câu)', description: 'Tổng hợp 50 câu hỏi vận dụng & thực tiễn', question_count: 50 }
    ],
    totalQuestions: fallbackQuestions.length || 150
  });
});

// 2. GET /api/quiz
app.get('/api/quiz', async (req, res) => {
  const { topic = 'ALL', count = '40', mode = 'practice', shuffle = 'true' } = req.query;
  const shouldShuffle = shuffle === 'true';

  if (useMySQL && pool) {
    try {
      let query = `
        SELECT q.id, q.topic_id, q.q_num, q.content, q.explanation, t.title as topic_title
        FROM questions q
        JOIN topics t ON q.topic_id = t.id
      `;
      const params = [];

      if (topic === 'ONTAP1') {
        query += ' WHERE t.code = ?';
        params.push('ONTAP1');
      } else if (topic === 'ONTAP2') {
        query += ' WHERE t.code = ?';
        params.push('ONTAP2');
      }

      const [rows] = await pool.query(query, params);
      let selectedQuestions = rows;
      if (shouldShuffle) selectedQuestions = shuffleArray(selectedQuestions);
      if (count !== 'all') {
        const limitNum = parseInt(count, 10);
        if (!isNaN(limitNum) && limitNum > 0) selectedQuestions = selectedQuestions.slice(0, limitNum);
      }

      if (selectedQuestions.length > 0) {
        const questionIds = selectedQuestions.map(q => q.id);
        const [allOptions] = await pool.query(
          `SELECT id, question_id, label, content, is_correct FROM options WHERE question_id IN (?)`,
          [questionIds]
        );

        const optionsByQuestion = {};
        for (const opt of allOptions) {
          if (!optionsByQuestion[opt.question_id]) optionsByQuestion[opt.question_id] = [];
          optionsByQuestion[opt.question_id].push(opt);
        }

        const displayLabels = ['A', 'B', 'C', 'D', 'E', 'F'];
        const formattedQuestions = selectedQuestions.map((q, index) => {
          let rawOptions = optionsByQuestion[q.id] || [];
          if (shouldShuffle) rawOptions = shuffleArray(rawOptions);

          const options = rawOptions.map((opt, optIndex) => {
            const optionData = {
              id: opt.id,
              displayLabel: displayLabels[optIndex] || opt.label,
              content: opt.content
            };
            if (mode === 'practice') optionData.isCorrect = Boolean(opt.is_correct);
            return optionData;
          });

          return {
            id: q.id,
            index: index + 1,
            originalNum: q.q_num,
            topicTitle: q.topic_title,
            content: q.content,
            options,
            explanation: mode === 'practice' ? q.explanation : undefined
          };
        });

        return res.json({ success: true, mode, topic, total: formattedQuestions.length, questions: formattedQuestions });
      }
    } catch (e) {
      console.error('Lỗi truy vấn MySQL trong /api/quiz, dùng fallback:', e.message);
    }
  }

  // Fallback to JSON
  let filtered = [...fallbackQuestions];
  if (topic === 'ONTAP1') filtered = filtered.filter(q => q.part_id === 1);
  else if (topic === 'ONTAP2') filtered = filtered.filter(q => q.part_id === 2);

  if (shouldShuffle) filtered = shuffleArray(filtered);
  if (count !== 'all') {
    const limitNum = parseInt(count, 10);
    if (!isNaN(limitNum) && limitNum > 0) filtered = filtered.slice(0, limitNum);
  }

  const displayLabels = ['A', 'B', 'C', 'D', 'E'];
  const formattedQuestions = filtered.map((q, index) => {
    let rawOptions = q.options.map(o => ({
      id: `${q.part_id}_${q.num}_${o.label}`,
      label: o.label,
      content: o.text,
      is_correct: o.label.toUpperCase() === q.correct_answer.toUpperCase()
    }));

    if (shouldShuffle) rawOptions = shuffleArray(rawOptions);

    const options = rawOptions.map((opt, optIdx) => {
      const optData = {
        id: opt.id,
        displayLabel: displayLabels[optIdx] || opt.label,
        content: opt.content
      };
      if (mode === 'practice') optData.isCorrect = opt.is_correct;
      return optData;
    });

    return {
      id: `${q.part_id}_${q.num}`,
      index: index + 1,
      originalNum: q.num,
      topicTitle: q.part_name,
      content: q.question,
      options,
      correctAnswer: q.correct_answer
    };
  });

  res.json({ success: true, mode, topic, total: formattedQuestions.length, questions: formattedQuestions });
});

// 3. POST /api/quiz/submit
app.post('/api/quiz/submit', async (req, res) => {
  const { studentName = 'Sinh viên', mode = 'exam', topicCode = 'ALL', timeSpentSeconds = 0, answers = [] } = req.body;

  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ success: false, message: 'Không có dữ liệu bài làm để chấm điểm.' });
  }

  if (useMySQL && pool) {
    const connection = await pool.getConnection();
    try {
      const questionIds = answers.map(a => a.questionId);
      const [correctOptions] = await connection.query(
        `SELECT o.id as option_id, o.question_id, o.content, o.label, o.is_correct, q.content as question_content
         FROM options o
         JOIN questions q ON o.question_id = q.id
         WHERE o.question_id IN (?)`,
        [questionIds]
      );

      const qMap = {};
      for (const opt of correctOptions) {
        if (!qMap[opt.question_id]) {
          qMap[opt.question_id] = { questionId: opt.question_id, questionContent: opt.question_content, options: [], correctOptionId: null };
        }
        qMap[opt.question_id].options.push({ id: opt.option_id, label: opt.label, content: opt.content, isCorrect: Boolean(opt.is_correct) });
        if (opt.is_correct) qMap[opt.question_id].correctOptionId = opt.option_id;
      }

      let correctCount = 0;
      const details = [];

      for (const item of answers) {
        const qInfo = qMap[item.questionId];
        if (!qInfo) continue;
        const isCorrect = item.selectedOptionId && item.selectedOptionId === qInfo.correctOptionId;
        if (isCorrect) correctCount++;
        details.push({
          questionId: item.questionId,
          questionContent: qInfo.questionContent,
          options: qInfo.options,
          selectedOptionId: item.selectedOptionId || null,
          correctOptionId: qInfo.correctOptionId,
          isCorrect: isCorrect ? 1 : 0
        });
      }

      const totalQuestions = answers.length;
      const score = Number(((correctCount / totalQuestions) * 10).toFixed(2));

      await connection.beginTransaction();
      const [attemptResult] = await connection.query(
        `INSERT INTO quiz_attempts (student_name, mode, topic_code, total_questions, correct_answers, score, time_spent_seconds)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [studentName, mode, topicCode, totalQuestions, correctCount, score, timeSpentSeconds]
      );

      const attemptId = attemptResult.insertId;
      for (const d of details) {
        await connection.query(
          `INSERT INTO quiz_attempt_details (attempt_id, question_id, selected_option_id, is_correct)
           VALUES (?, ?, ?, ?)`,
          [attemptId, d.questionId, d.selectedOptionId, d.isCorrect]
        );
      }
      await connection.commit();

      return res.json({
        success: true,
        attemptId,
        score,
        correctCount,
        totalQuestions,
        percentage: Math.round((correctCount / totalQuestions) * 100),
        timeSpentSeconds,
        details
      });
    } catch (err) {
      await connection.rollback();
      console.error('Lỗi khi nộp bài trên MySQL, dùng fallback:', err);
    } finally {
      connection.release();
    }
  }

  // Fallback submit
  let correctCount = 0;
  const details = [];

  for (const item of answers) {
    const q = fallbackQuestions.find(fq => `${fq.part_id}_${fq.num}` == item.questionId);
    if (!q) continue;

    const correctOptId = `${q.part_id}_${q.num}_${q.correct_answer.toUpperCase()}`;
    const isCorrect = item.selectedOptionId === correctOptId;
    if (isCorrect) correctCount++;

    details.push({
      questionId: item.questionId,
      questionContent: q.question,
      options: q.options.map(o => ({
        id: `${q.part_id}_${q.num}_${o.label}`,
        label: o.label,
        content: o.text,
        isCorrect: o.label.toUpperCase() === q.correct_answer.toUpperCase()
      })),
      selectedOptionId: item.selectedOptionId,
      correctOptionId: correctOptId,
      isCorrect: isCorrect ? 1 : 0
    });
  }

  const totalQuestions = answers.length;
  const score = Number(((correctCount / totalQuestions) * 10).toFixed(2));
  const record = {
    id: memoryAttempts.length + 1,
    student_name: studentName,
    mode,
    topic_code: topicCode,
    total_questions: totalQuestions,
    correct_answers: correctCount,
    score,
    time_spent_seconds: timeSpentSeconds,
    created_at: new Date().toISOString()
  };
  memoryAttempts.unshift(record);

  res.json({
    success: true,
    attemptId: record.id,
    score,
    correctCount,
    totalQuestions,
    percentage: Math.round((correctCount / totalQuestions) * 100),
    timeSpentSeconds,
    details
  });
});

// 4. GET /api/attempts
app.get('/api/attempts', async (req, res) => {
  if (useMySQL && pool) {
    try {
      const [rows] = await pool.query(`
        SELECT id, student_name, mode, topic_code, total_questions, correct_answers, score, time_spent_seconds, created_at
        FROM quiz_attempts
        ORDER BY id DESC
        LIMIT 20
      `);
      return res.json({ success: true, attempts: rows });
    } catch (e) {
      console.error('Lỗi lấy lịch sử từ MySQL:', e.message);
    }
  }
  res.json({ success: true, attempts: memoryAttempts.slice(0, 20) });
});

// 5. GET /api/questions/bank
app.get('/api/questions/bank', async (req, res) => {
  const { search = '', topic = 'ALL' } = req.query;

  if (useMySQL && pool) {
    try {
      let query = `
        SELECT q.id, q.q_num, q.content, q.explanation, t.code as topic_code, t.title as topic_title
        FROM questions q
        JOIN topics t ON q.topic_id = t.id
        WHERE 1=1
      `;
      const params = [];
      if (topic !== 'ALL') { query += ' AND t.code = ?'; params.push(topic); }
      if (search.trim()) { query += ' AND q.content LIKE ?'; params.push(`%${search.trim()}%`); }
      query += ' ORDER BY q.topic_id ASC, q.q_num ASC';

      const [questions] = await pool.query(query, params);
      if (questions.length > 0) {
        const qIds = questions.map(q => q.id);
        const [options] = await pool.query(`SELECT id, question_id, label, content, is_correct FROM options WHERE question_id IN (?) ORDER BY id ASC`, [qIds]);
        const optMap = {};
        for (const o of options) {
          if (!optMap[o.question_id]) optMap[o.question_id] = [];
          optMap[o.question_id].push(o);
        }
        return res.json({ success: true, count: questions.length, questions: questions.map(q => ({ ...q, options: optMap[q.id] || [] })) });
      }
    } catch (e) {
      console.error('Lỗi tra cứu bank từ MySQL:', e.message);
    }
  }

  // Fallback bank
  let filtered = [...fallbackQuestions];
  if (topic === 'ONTAP1') filtered = filtered.filter(q => q.part_id === 1);
  else if (topic === 'ONTAP2') filtered = filtered.filter(q => q.part_id === 2);

  if (search.trim()) {
    const s = search.trim().toLowerCase();
    filtered = filtered.filter(q => q.question.toLowerCase().includes(s));
  }

  const result = filtered.map(q => ({
    id: `${q.part_id}_${q.num}`,
    q_num: q.num,
    content: q.question,
    topic_title: q.part_name,
    options: q.options.map(o => ({
      id: `${q.part_id}_${q.num}_${o.label}`,
      label: o.label,
      content: o.text,
      is_correct: o.label.toUpperCase() === q.correct_answer.toUpperCase() ? 1 : 0
    }))
  }));

  res.json({ success: true, count: result.length, questions: result });
});

app.listen(PORT, () => {
  console.log(`Server web trắc nghiệm đang chạy tại: http://localhost:${PORT}`);
});

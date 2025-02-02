const express = require('express'); // Express 서버 설정
const app = express(); // Express 앱 생성
const multer = require('multer'); // 파일 업로드 설정
const upload = multer({ dest: 'uploads/' }); // 업로드 파일 저장 경로 설정
const mysql = require('mysql2'); // MySQL 연결
const cors = require('cors'); // 크로스 오리진 설정
const jwt = require('jsonwebtoken'); // JWT 토큰 생성 및 검증
const bcrypt = require('bcrypt'); // 비밀번호 해싱
require('dotenv').config(); // 환경 변수 설정

const pool = mysql.createPool({ // MySQL 풀 생성
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
}).promise(); // 프로미스 기반 연결 풀 생성

const corsOptions = {
  origin: ['http://210.117.212.81:80', 'http://210.117.212.81', 'http://localhost:3000', 'http://localhost'], // 허용된 출처
  credentials: true, // 자격 증명 포함
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // 허용된 메서드
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept'], // 허용된 헤더
  exposedHeaders: ['Content-Range', 'X-Content-Range'] // 노출된 헤더
};

app.options('*', cors(corsOptions)); // 모든 요청에 대해 크로스 오리진 설정
app.use(cors(corsOptions)); // 크로스 오리진 설정
app.use(express.json()); // JSON 파싱

const PORT = process.env.PORT || 3000; // 포트 설정
app.listen(PORT, '0.0.0.0', () => { // 서버 실행
  console.log(`Server is running on port ${PORT}`); // 서버 실행 메시지
});

// 토큰 인증 미들웨어 함수
const authenticateToken = (req, res, next) => { // 토큰 인증 미들웨어
  const authHeader = req.headers['authorization']; // 인증 헤더 가져오기
  const token = authHeader && authHeader.split(' ')[1]; // 토큰 추출

  if (!token) { // 토큰이 없는 경우
    return res.status(401).json({ error: '토큰이 제공되지 않았습니다.' }); // 401 에러 반환
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => { // 토큰 검증
    if (err) { // 토큰 검증 실패
      return res.status(403).json({ error: '유효하지 않거나 만료된 토큰.😥' }); // 403 에러 반환
    }
    req.user = user; // 사용자 정보 설정
    next(); // 다음 미들웨어 호출
  });
};

// 회원가입 엔드포인트
app.post('/auth/signup', async (req, res) => { // 회원가입 엔드포인트
  let connection; // 연결 객체
  try {
    const { name, email, password } = req.body; // 요청 본문에서 이름, 이메일, 비밀번호 추출

    // 입력값 검증
    if (!name || !email || !password) { // 모든 필드가 입력되지 않은 경우
      return res.status(400).json({ // 400 에러 반환
        success: false,
        message: '모든 필드를 입력해주세요.'
      });
    }

    connection = await pool.getConnection();
    
    // 이메일 중복 체크
    const [existing] = await connection.query(
      'SELECT user_id FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: '이미 사용중인 이메일입니다.'
      });
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 12);

    // 사용자 생성
    const [result] = await connection.query( // 사용자 생성
      'INSERT INTO users (email, password, name, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())',
      [email.toLowerCase(), hashedPassword, name]
    );

    res.status(201).json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      data: {
        user_id: result.insertId,
        name,
        email: email.toLowerCase()
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (connection) connection.release();
  }
});

// 로그인 엔드포인트
app.post('/auth/login', async (req, res) => {
  let connection;
  try {
    const { email, password } = req.body;

    // 입력값 검증
    if (!email?.trim() || !password?.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: '이메일과 비밀번호를 입력해주세요.' 
      });
    }

    connection = await pool.getConnection();

    // 사용자 조회
    const [users] = await connection.query(
      'SELECT user_id, name, email, password FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: '인증 정보가 일치하지 않습니다.' 
      });
    }

    const user = users[0];
    // 비밀번호 검증
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        message: '인증 정보가 일치하지 않습니다.' 
      });
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      { 
        userId: user.user_id, 
        email: user.email 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: '로그인 성공',
      data: {
        token,
        user: {
          user_id: user.user_id,
          name: user.name,
          email: user.email
        }
      }
    });

  } catch (error) {
    console.error('로그인 에러:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.' 
    });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/reviews', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();

    const [rows] = await connection.query(
      `SELECT r.review_id AS id, r.user_id, r.content, r.image, 
              r.created_at, r.updated_at, 
              u.name AS user_name, u.email AS user_email 
       FROM reviews r 
       JOIN users u ON r.user_id = u.user_id 
       ORDER BY r.created_at DESC`
    );

    res.json(rows);
  } catch (error) {
    console.error('리뷰 불러오기 에러:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류로 인해 리뷰를 불러올 수 없습니다.'
    });
  } finally {
    if (connection) connection.release();
  }
});

app.post('/reviews', authenticateToken, upload.single('image'), async (req, res) => {
  let connection;
  try {
    const { content, store_id } = req.body;
    const user_id = req.user.userId;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    // 필수 입력값 검증
    if (!content || !store_id) {
      return res.status(400).json({
        success: false,
        message: '리뷰 내용과 가게 정보는 필수입니다.'
      });
    }

    connection = await pool.getConnection();

    // 리뷰 정보 저장
    const [result] = await connection.query(
      `INSERT INTO reviews (
        user_id, store_id, content, image, created_at, updated_at
      ) VALUES (?, ?, ?, ?, NOW(), NOW())`,
      [user_id, store_id, content, image]
    );

    res.status(201).json({
      success: true,
      message: '리뷰가 등록되었습니다.',
      data: {
        review_id: result.insertId,
        user_id,
        store_id,
        content,
        image,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

  } catch (error) {
    console.error('리뷰 등록 에러:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류로 인해 리뷰를 등록할 수 없습니다.'
    });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/reviews/store/:storeId', async (req, res) => {
  let connection;
  try {
    const { storeId } = req.params;
    
    connection = await pool.getConnection();
    
    const [rows] = await connection.query(
      `SELECT r.review_id AS id, r.store_id, r.user_id, r.content, r.image, 
              r.created_at, r.updated_at, 
              u.name AS user_name, u.email AS user_email 
       FROM reviews r 
       JOIN users u ON r.user_id = u.user_id 
       WHERE r.store_id = ? 
       ORDER BY r.created_at DESC`,
      [storeId]
    );

    // 결과가 없을 경우에도 빈 배열 반환
    res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    console.error('리뷰 불러오기 에러:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류로 인해 리뷰를 불러올 수 없습니다.'
    });
  } finally {
    if (connection) connection.release();
  }
});

app.get('/reviews/detail/:id', async (req, res) => {
  let connection;
  try {
    const { id } = req.params;

    connection = await pool.getConnection();

    const [reviews] = await connection.query(
      `SELECT r.*, u.name as user_name 
       FROM reviews r 
       JOIN users u ON r.user_id = u.user_id 
       WHERE r.review_id = ?`,
      [id]
    );

    if (reviews.length === 0) {
      return res.status(404).json({
        success: false,
        message: '해당 리뷰를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: reviews[0]
    });

  } catch (error) {
    console.error('리뷰 조회 에러:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  } finally {
    if (connection) connection.release();
  }
});

// 리뷰 수정 엔드포인트 수정
app.put('/reviews/:reviewId', authenticateToken, async (req, res) => {
  let connection;
  try {
    const { reviewId } = req.params;
    const { content, image } = req.body;
    const userId = req.user.user_id; // authenticateToken 미들웨어에서 설정

    // 입력값 검증
    if (!content) {
      return res.status(400).json({
        success: false,
        message: '리뷰 내용을 입력해주세요.'
      });
    }

    connection = await pool.getConnection();

    // 리뷰 존재 여부 및 작성자 확인
    const [existingReview] = await connection.query(
      'SELECT * FROM reviews WHERE review_id = ?',
      [reviewId]
    );

    if (existingReview.length === 0) {
      return res.status(404).json({
        success: false,
        message: '해당 리뷰를 찾을 수 없습니다.'
      });
    }

    if (existingReview[0].user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: '이 리뷰를 수정할 권한이 없습니다.'
      });
    }

    // 리뷰 업데이트
    await connection.query(
      `UPDATE reviews 
       SET content = ?, image = ?, updated_at = NOW() 
       WHERE review_id = ?`,
      [content, image, reviewId]
    );

    res.json({
      success: true,
      message: '리뷰가 수정되었습니다.',
      data: {
        review_id: reviewId,
        content,
        image,
        updated_at: new Date()
      }
    });

  } catch (error) {
    console.error('리뷰 수정 에러:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류로 인해 리뷰를 수정할 수 없습니다.'
    });
  } finally {
    if (connection) connection.release();
  }
});

app.delete('/reviews/:reviewId', async (req, res) => {
  let connection;
  try {
    const { reviewId } = req.params;

    connection = await pool.getConnection();

    // 리뷰 존재 여부 확인
    const [existingReview] = await connection.query(
      'SELECT * FROM reviews WHERE review_id = ?',
      [reviewId]
    );

    if (existingReview.length === 0) {
      return res.status(404).json({
        success: false,
        message: '해당 리뷰를 찾을 수 없습니다.'
      });
    }

    // 리뷰 삭제
    await connection.query(
      'DELETE FROM reviews WHERE review_id = ?',
      [reviewId]
    );

    res.json({
      success: true,
      message: '리뷰가 삭제되었습니다.'
    });

  } catch (error) {
    console.error('리뷰 삭제 에러:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류로 인해 리뷰를 삭제할 수 없습니다.'
    });
  } finally {
    if (connection) connection.release();
  }
});

// 토큰 검증 엔드포인트
app.get('/auth/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ success: false, message: '토큰이 제공되지 않았습니다.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error('토큰 검증 실패:', err);
      return res.status(403).json({ success: false, message: '토큰 검증 실패.😥' });
    }

    // 토큰이 유효한 경우 사용자 정보 반환
    res.json({ success: true, user: { user_id: decoded.userId, email: decoded.email } });
  });
});
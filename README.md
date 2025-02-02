# GoodStore (착한가격업소)

🛒 착한가격업소 소개 웹 서비스입니다. 서울시 내의 착한가격업소들을 쉽게 찾고 이용할 수 있도록 도와주는 플랫폼입니다.

## 🌟 주요 기능

- **지도 기반 검색**: 카카오맵 API를 활용한 직관적인 위치 기반 검색
- **카테고리별 필터링**: 음식점, 이미용, 세탁 등 업종별 필터링 제공
- **구별 검색**: 서울시 25개 구별 검색 기능
- **하루 세끼 추천**: 아침/점심/저녁 식사 장소 추천 경로 제공
- **리뷰 시스템**: 사용자 리뷰 작성 및 관리 기능
- **다크모드**: 사용자 편의를 위한 다크모드 지원

## 🚀 설치 및 실행 방법

1. 저장소 클론

git clone https://github.com/timhadin/goodstore.git
cd goodstore

2. 의존성 설치

npm install

3. 환경 변수 설정
- `.env` 파일을 생성하고 다음 변수들을 설정:
  - DB_HOST
  - DB_PORT
  - DB_USER
  - DB_PASSWORD
  - DB_NAME
  - JWT_SECRET

4. 서버 실행

npm start

## 🏗️ 기술 스택

### 프론트엔드
- HTML5
- CSS3
- JavaScript
- Kakao Maps API

### 백엔드
- Node.js
- Express
- MySQL
- JWT 인증

### 주요 라이브러리

🏗️ 사용 기술

프론트엔드: HTML5, CSS3, JavaScript

백엔드: Node.js, Express

데이터베이스: MySQL

인증 시스템: JWT

## 🔐 인증 기능

- 회원가입/로그인
- JWT 기반 인증
- 사용자별 리뷰 관리

## 🎨 UI/UX

- 반응형 디자인
- 다크모드 지원
- 직관적인 지도 인터페이스
- 사용자 친화적인 카테고리 필터

## 🔄 API 엔드포인트

- `POST /auth/login`: 로그인
- `POST /auth/signup`: 회원가입
- `GET /auth/verify`: 토큰 검증
- `GET /stores`: 가게 목록 조회
- `POST /reviews`: 리뷰 작성
- `PUT /reviews/:reviewId`: 리뷰 수정
- `DELETE /reviews/:reviewId`: 리뷰 삭제

## 🔒 보안

- bcrypt를 이용한 비밀번호 해싱
- JWT 기반 인증
- CORS 설정을 통한 보안 강화
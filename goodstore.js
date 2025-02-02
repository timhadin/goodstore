// 서버 URL 상수 정의 수정
const SERVER_URL = "http://210.117.212.81:3000";

// 스타일 동적 추가
const style = document.createElement("style"); // 스타일 요소 생성
style.textContent = `
.custom-marker {
  white-space: nowrap; 
  cursor: pointer;
  transition: transform 0.2s;
} 
.custom-marker:hover {
  transform: scale(1.1);
}
`;
document.head.appendChild(style); // 스타일 요소를 헤드에 추가

const appState = {
  map: null, // 지도 객체
  storeList: null, // 가게 목록 요소
  storeMarkers: {}, // 가게 마커 객체들
  activeCategory: "", // 활성화된 카테고리
  activeDistrict: "", // 활성화된 구
  cachedAllStores: null, // 모든 가게 데이터 캐시
  cachedGeocodedStores: {}, // 지오코딩된 가게 데이터 캐시
  isLoggedIn: false, // 로그인 상태
  routeMarkers: [], // 경로 마커 배열
  routeLines: [], // 경로 선 배열
  mealTimeStores: { // 식사 시간별 가게
    breakfast: null, // 아침 식사 가게
    lunch: null, // 점심 식사 가게
    dinner: null, // 저녁 식사 가게
  },
  currentUser: null, // 현재 사용자 객체
};

// 서울의 모든 구 목록 (가나다 순으로 정렬)
const districts = [
  "강남구",
  "강동구",
  "강북구",
  "강서구",
  "관악구",
  "광진구",
  "구로구",
  "노원구",
  "도봉구",
  "동대문구",
  "동작구",
  "마포구",
  "서대문구",
  "서초구",
  "성동구",
  "성북구",
  "송파구",
  "양천구",
  "영등포구",
  "용산구",
  "은평구",
  "종로구",
  "중구",
  "중랑구",
];

const categoryCodes = {
  "001": "한식",
  "002": "중식",
  "003": "경양식/일식",
  "004": "기타외식업",
  "005": "이미용",
  "006": "목욕업",
  "007": "세탁",
  "008": "숙박업(호텔,여관)",
  "009": "영화관람",
  "010": "VTR대여",
  "011": "노래방",
  "012": "수영장/볼링장/당구장/골프연습장",
  "013": "기타서비스업",
};

document.addEventListener("DOMContentLoaded", function () { // 페이지 로드 시 실행
  init(); // 초기화 함수 호출

  if (window.auth && typeof window.auth.initAuth === 'function') { // 인증 초기화 함수 호출
    window.auth.initAuth(appState); // 인증 초기화 함수 호출
  }

  // 항상 라이트 모드로 시작
  document.documentElement.setAttribute("data-theme", "light"); // 라이트 모드 설정
  updateDarkModeButton("light"); // 다크모드 버튼 업데이트
  localStorage.setItem("theme", "light"); // 로컬 스토리지에 라이트 모드 저장

  // 다크모드 토글 버튼 이벤트 리스너
  const darkModeToggle = document.getElementById("darkModeToggle"); // 다크모드 토글 버튼 요소 선택
  if (darkModeToggle) { // 다크모드 토글 버튼이 존재하는 경우
    darkModeToggle.addEventListener("click", toggleDarkMode); // 다크모드 토글 버튼 이벤트 리스너 추가
  }
});

// 지도 초기화 함수
function initializeMap() {
  var container = document.getElementById("map"); // 지도 컨테이너 요소 선택
  var options = { // 지도 옵션
    center: new kakao.maps.LatLng(37.5665, 126.978), // 서울 중심 좌표
    level: 9, // 레벨을 높여 서울 전체가 보이도록 설정
  };

  appState.map = new kakao.maps.Map(container, options); // 지도 객체 생성
}

// 페이지 로드 시 실행
function init() { // 초기화 함수
  appState.storeList = document.getElementById("storeList"); // 가게 목록 요소 선택
  appState.storeList.innerHTML = ""; // 가게 목록 초기화
  createCategoryButtons(); // 카테고리 버튼 생성
  createDistrictSelect(); // 구 선택 드롭다운 생성
  initializeMap(); // 지도 초기화
}

// 카테고리 버튼 생성 함수 수정
function createCategoryButtons() { // 카테고리 버튼 생성 함수
  var categoryContainer = document.querySelector(".category-grid"); // 카테고리 컨테이너 요소 선택
  categoryContainer.innerHTML = ""; // 기존 버튼 제거

  // 카테고리 버튼들 생성
  Object.entries(categoryCodes).forEach(([code, name]) => { // 카테고리 코드와 이름 반복
    var button = document.createElement("button"); // 버튼 요소 생성
    button.className = "category-btn"; // 버튼 클래스 설정
    button.textContent = name; // 버튼 텍스트 설정
    button.setAttribute("data-category", code); // 버튼 데이터 카테고리 설정
    button.addEventListener("click", function () { // 버튼 클릭 이벤트 리스너 추가  
      clearRouteMarkersAndLines(); // 경로 마커와 선 제거
      setActiveCategory(this, code); // 활성화된 카테고리 설정
    });
    categoryContainer.appendChild(button); // 카테고리 컨테이너에 버튼 추가

    // 경양식/일식 버튼 다음에 추천 식사 경로 버튼 추가
    if (name === "기타외식업") {
      // 추천 식사 경로 버튼 추가
      var routeButton = document.createElement("button"); // 버튼 요소 생성
      routeButton.className = "category-btn route-btn"; // 버튼 클래스 설정
      routeButton.textContent = "🌅 하루 세 끼 추천 경로 보기 🌙"; // 버튼 텍스트 설정
      routeButton.onclick = showMealTimeRoute; // 추천 식사 경로 버튼 클릭 이벤트 리스너 추가
      categoryContainer.appendChild(routeButton); // 카테고리 컨테이너에 버튼 추가

      // 구분선 추가
      var divider = document.createElement("div"); // 구분선 요소 생성
      divider.className = "category-divider"; // 구분선 클래스 설정
      categoryContainer.appendChild(divider); // 카테고리 컨테이너에 구분선 추가
    }
  });
}

// 구 선택 드롭다운 생성 함수
function createDistrictSelect() { // 구 선택 드롭다운 생성 함수
  var districtSelect = document.getElementById("districtSelect"); // 구 선택 드롭다운 요소 선택
  districts.forEach(function (district) { // 구 목록 반복
    var option = document.createElement("option"); // 옵션 요소 생성
    option.value = district; // 옵션 값 설정
    option.textContent = district; // 옵션 텍스트 설정
    districtSelect.appendChild(option); // 구 선택 드롭다운에 옵션 추가
  });
  districtSelect.addEventListener("change", function () { // 구 선택 드롭다운 변경 이벤트 리스너 추가
    // 이전 마커들과 오버레이 제거
    clearMarkers();

    // 경로 표시 제거 추가
    clearRouteDisplay();

    // 경로 저장 변수 초기화
    mealTimeStores = {
      breakfast: null, // 아침 식사 가게
      lunch: null, // 점심 식사 가게
      dinner: null, // 저녁 식사 가게
    };

    appState.storeList.innerHTML = ""; // 가게 목록 초기화

    // 캐시 초기화
    appState.districtStoresCache = {}; // 구별 가게 데이터 캐시 초기화

    appState.activeDistrict = this.value; // 활성화된 구 설정
    if (appState.activeDistrict) { // 선택된 구가 있는 경우
      // 선택된 구의 중심 좌표로 이동
      var geocoder = new kakao.maps.services.Geocoder(); // 지오코더 객체 생성
      geocoder.addressSearch( // 구 주소 검색
        "서울특별시 " + appState.activeDistrict, // 구 주소 검색
        function (result, status) { // 지오코딩 결과 처리 함수
          if (status === kakao.maps.services.Status.OK) { // 지오코딩 성공
            var coords = new kakao.maps.LatLng(result[0].y, result[0].x); // 좌표 설정

            // 부드럽게 이동하면 확대
            appState.map.setLevel(5); // 구 단위에 적절한 확대 레벨
            appState.map.panTo(coords); // 좌표로 이동

            // 딜레이 후 데이터 로드 (지도 이동 애니메이션이 완료된 후)
            setTimeout(() => { // 딜레이 후 가게 데이터 로드
              fetchAndDisplayStores(); // 가게 데이터 로드
            }, 500); // 딜레이 후 가게 데이터 로드
          }
        }
      );
    } else { // 구가 선택되지 않은 경우
      // 서울 전체 보기로 되돌리기
      appState.map.setLevel(9); // 구 단위에 적절한 확대 레벨
      appState.map.setCenter(new kakao.maps.LatLng(37.5665, 126.978)); // 서울 중심 좌표로 이동
      appState.storeList.innerHTML = `<p></p>`; // 가게 목록 초기화
    }
  });
}

function setActiveCategory(button, category) { // 활성화된 카테고리 설정 함수
  // 기존 마커들 제거
  clearMarkers(); // 기존 마커들 제거

  // 식사 시간 마커와 선 제거 (routeMarkers 초기화는 clearRouteMarkersAndLines에서 처리)
  clearRouteMarkersAndLines(); // 경로 마커와 선 제거

  // 이전에 선택된 가게 초기화
  selectedStoreId = null; // 선택된 가게 ID 초기화

  // 모든 버튼의 active 상태 제거
  document.querySelectorAll(".category-btn").forEach((btn) => { // 모든 버튼 반복
    btn.classList.remove("active"); // active 상태 제거
  });

  if (appState.activeCategory === category) { // 활성화된 카테고리가 이미 선택된 카테고리와 같은 경우
    appState.activeCategory = ""; // 활성화된 카테고리 초기화
    fetchAndDisplayStores(); // 가게 데이터 로드
    return; // 함수 종료
  }

  // 현재 선택된 버튼을 활성화
  button.classList.add("active"); // 활성화된 버튼 클래스 추가
  appState.activeCategory = category; // 활성화된 카테고리 설정

  // 선택된 카테고리에 해당하는 가게들 표시
  fetchAndDisplayStores(); // 가게 데이터 로드
}

// 전역 변수 추가
let districtStoresCache = {}; // 구별 가게 데이터 캐시

async function fetchAllStores(callback) { // 모든 가게 데이터 로드 함수
  if (!appState.activeDistrict) { // 구가 선택되지 않은 경우
    callback([]); // 빈 배열 반환
    return;
  }

  // 캐시된 데이터가 있으면 사용
  if (districtStoresCache[appState.activeDistrict]) { // 캐시된 데이터가 있는 경우
    console.log(`Using cached data for ${appState.activeDistrict}`); // 캐시된 데이터 사용 로그 출력
    callback(districtStoresCache[appState.activeDistrict]); // 캐시된 데이터 반환
    return; // 함수 종료
  }

  // 캐시된 데이터가 없면 API 호출
  fetch(
    `http://openapi.seoul.go.kr:8088/684476426c746a643934416742415a/json/ListPriceModelStoreService/1/1/`
  )
    .then((response) => response.json()) // 응답 데이터 파싱
    .then(async (data) => { // 데이터 처리
      const totalCount = data.ListPriceModelStoreService.list_total_count; // 총 가게 수
      const promises = []; // 프로미스 배열 초기화
      const pageSize = 1000; // 페이지 크기
      const pageCount = Math.ceil(totalCount / pageSize); // 총 페이지 수

      // 가게 데이터 가져오기
      for (let i = 0; i < pageCount; i++) { // 각 페이지 데이터 가져오기
        const start = i * pageSize + 1; // 시작 인덱스
        const end = Math.min((i + 1) * pageSize, totalCount); // 끝 인덱스
        const promise = fetch( // 가게 데이터 가져오기
          `http://openapi.seoul.go.kr:8088/684476426c746a643934416742415a/json/ListPriceModelStoreService/${start}/${end}` // API 요청 URL
        ).then((response) => response.json()); // 응답 데이터 파싱
        promises.push(promise); // 프로미스 배열에 추가
      }

      const results = await Promise.all(promises); // 모든 프로미스 완료 대기
      let allStores = []; // 모든 가게 데이터 배열 초기화
      results.forEach((result) => { // 각 페이지 데이터 처리
        if ( // 가게 데이터가 있는 경우
          result.ListPriceModelStoreService && // 가게 데이터가 있는 경우
          result.ListPriceModelStoreService.row // 가게 데이터가 있는 경우
        ) {
          allStores = allStores.concat(result.ListPriceModelStoreService.row); // 모든 가게 데이터 배열에 추가
        }
      });

      let filteredStores = allStores.filter( // 구별 가게 데이터 필터링
        (store) => // 가게 데이터 반복
          store.SH_ADDR && store.SH_ADDR.includes(appState.activeDistrict) // 가게 주소에 선택된 구가 포함되는 경우
      );

      if (filteredStores.length > 0) { // 필터링된 가게 데이터가 있는 경우
        // 지오코딩과 메뉴 정보를 동시에 가져오기
        geocodeAllStores(filteredStores, async (validStores) => { // 지오코딩 및 메뉴 정보 가져오기
          // 모든 가게의 메뉴 정보를 한번에 가져오기
          const menuPromises = validStores.map( // 각 가게의 메뉴 정보 가져오기
            (store) =>
              fetchStoreMenu(store.SH_ID) // 가게 메뉴 정보 가져오기
                .then((menuItems) => { // 메뉴 정보 처리
                  store.menuItems = menuItems; // 가게 메뉴 정보 설정
                  return store; // 가게 정보 반환
                })
                .catch(() => store) // 메뉴 정보 실패시에도 가게 정보는 유지
          );

          await Promise.all(menuPromises); // 모든 메뉴 정보 가져오기
          districtStoresCache[appState.activeDistrict] = validStores; // 구별 가게 데이터 캐시 업데이트
          callback(validStores); // 가게 데이터 반환
        });
      } else { // 필터링된 가게 데이터가 없는 경우
        callback([]); // 빈 배열 반환
      }
    });
}

function geocodeAllStores(stores, callback) { // 모든 가게 데이터 지오코딩 함수
  const geocoder = new kakao.maps.services.Geocoder(); // 지오코더 객체 생성
  const geocodingPromises = []; // 지오코딩 프로미스 배열 초기화

  stores.forEach((store) => { // 각 가게 데이터 처리
    if (appState.cachedGeocodedStores[store.SH_ID]) { // 캐시된 지오코딩 데이터가 있는 경우
      store.latitude = appState.cachedGeocodedStores[store.SH_ID].latitude; // 위도 설정
      store.longitude = appState.cachedGeocodedStores[store.SH_ID].longitude; // 경도 설정
      geocodingPromises.push(Promise.resolve()); // 프로미스 추가
    } else { // 캐시된 지오코딩 데이터가 없는 경우
      const promise = new Promise((resolve) => { // 지오코딩 프로미스 생성
        geocoder.addressSearch(store.SH_ADDR, function (result, status) { // 주소 검색
          if (status === kakao.maps.services.Status.OK) { // 지오코딩 성공
            store.latitude = parseFloat(result[0].y); // 위도 설정
            store.longitude = parseFloat(result[0].x); // 경도 설정

            appState.cachedGeocodedStores[store.SH_ID] = { // 캐시된 지오코딩 데이터 업데이트
              latitude: store.latitude, // 위도 설정
              longitude: store.longitude, // 경도 설정
            };
          } else { // 지오코딩 실패
            store.latitude = null; // 위도 초기화
            store.longitude = null; // 경도 초기화
          }
          resolve(); // 프로미스 완료
        });
      });
      geocodingPromises.push(promise); // 지오코딩 프로미스 배열에 추가
    }
  });

  Promise.all(geocodingPromises).then(() => { // 모든 지오코딩 프로미스 완료 대기
    const validStores = stores.filter( // 위도와 경도가 있는 가게 데이터 필터링
      (store) => store.latitude && store.longitude // 위도와 경도가 있는 경우
    ); 
    callback(validStores); // 위도와 경도가 있는 가게 데이터 반환
  }); 
}

function fetchAndDisplayStores() { // 가게 데이터 로드 및 표시 함수
  if (!appState.activeDistrict) { // 구가 선택되지 않은 경우
    clearMarkers(); // 기존 마커 제거
    appState.storeList.innerHTML = ""; // 가게 목록 초기화
    return; // 함수 종료
  }

  isLoading = true; // 로딩 상태 설정
  appState.storeList.innerHTML = "<p>데이터를 불러오는 중입니다⏳</p>"; // 가게 목록 표시

  fetchAllStores(function (allStores) { // 모든 가게 데이터 로드
    let stores = allStores; // 가게 데이터 설정

    // 카테고리 필터링 (캐시된 데이터에서 필터링)
    if (appState.activeCategory) { // 카테고리가 선택된 경우
      stores = stores.filter( // 카테고리에 해당하는 가게 데이터 필터링
        (store) => store.INDUTY_CODE_SE === appState.activeCategory // 업종 코드가 선택된 카테고리와 같은 경우
      );
    }

    if (stores.length > 0) { // 가게 데이터가 있는 경우
      displayStores(stores); // 가게 데이터 표시
      appState.storeList.innerHTML = `<p>${stores.length}개의 가게가 검색되었습니다.</p>`; // 가게 목록 표시
    } else { // 가게 데이터가 없는 경우
      appState.storeList.innerHTML = // 가게 목록 표시
        "<p>현재 지도 영역 내에 가게가 없습니다.</p>";
      clearMarkers(); // 기존 마커 제거
    }
    isLoading = false; // 로딩 상태 초기화
  });
}

let selectedStoreId = null; // 선택된 가게 ID 초기화

function displayStores(stores) { // 가게 데이터 표시 함수
  // 기존 마커만 제거하고 오버레이는 유지
  for (var key in appState.storeMarkers) { // 각 마커 데이터 처리
    if (appState.storeMarkers[key].marker) { // 마커가 있는 경우
      appState.storeMarkers[key].marker.setMap(null); // 마커 제거
    }
  }

  stores.forEach((store) => { // 각 가게 데이터 처리
    if (store.latitude && store.longitude) { // 위도와 경도가 있는 경우
      var coords = new kakao.maps.LatLng(store.latitude, store.longitude); // 좌표 설정

      // 마커 생성 및 지도에 추가
      var marker = new kakao.maps.Marker({ // 마커 생성
        position: coords, // 좌표 설정
        map: appState.map, // 지도 설정
      });

      // 기존 오버레이가 있으면 재사용
      let customOverlay = appState.storeMarkers[store.SH_ID]?.overlay; // 기존 오버레이 확인
      let content; // 오버레이 요소 변수 초기화

      if (!customOverlay) { // 기존 오버레이가 없는 경우
        content = document.createElement("div"); // 오버레이 요소 생성
        content.className = `marker-label custom-marker ${ 
          selectedStoreId === store.SH_ID ? 'selected' : '' // 선택된 가게인 경우 스타일 변경
        }`; // 오버레이 요소 클래스 설정
        content.innerHTML = store.SH_NAME; // 오버레이 요소 내용 설정

        customOverlay = new kakao.maps.CustomOverlay({ // 오버레이 생성
          position: coords, // 좌표 설정
          content: content, // 오버레이 요소 설정
          map: appState.map, // 지도 설정
          yAnchor: 1, // 오버레이 요소 위치 설정
          zIndex: selectedStoreId === store.SH_ID ? 999 : 1, // 선택된 가게인 경우 우선순위 설정
        });
      } else {
        // 기존 오버레이의 위치만 업데이트
        customOverlay.setPosition(coords); // 오버레이 위치 업데이트
        content = customOverlay.getContent(); // 오버레이 요소 가져오기
      }

      // handleClick 함수 수정
      const handleClick = function () { // 마커 클릭 이벤트 처리 함수
        // 이전에 선택된 모든 마커의 스타일 초기화
        Object.values(appState.storeMarkers).forEach((item) => { // 각 마커 데이터 처리
          if (item.overlay) { // 오버레이가 있는 경우
            const overlayContent = item.overlay.getContent(); // 오버레이 요소 가져오기
            overlayContent.className = 'marker-label custom-marker'; // 오버레이 요소 클래스 설정
            item.overlay.setZIndex(1); // 오버레이 요소 우선순위 설정
          }
        });

        // 현재 선택된 가게 ID 업데이트
        selectedStoreId = store.SH_ID; // 선택된 가게 ID 업데이트

        // 선택된 마커의 스타일 변경
        if (customOverlay) { // 오버레이가 있는 경우
          customOverlay.setZIndex(999); // 오버레이 요소 우선순위 설정
          content.className = 'marker-label custom-marker selected'; // 오버레이 요소 클래스 설정
        }

        // 우측 정보 표시
        showStoreDetails(store); // 가게 상세 정보 표시
      };

      // 마커 클릭 이벤트
      kakao.maps.event.addListener(marker, "click", handleClick); // 마커 클릭 이벤트 처리

      // 오버레이 클릭 이벤트
      content.onclick = handleClick; // 오버레이 클릭 이벤트 처리

      // appState.storeMarkers 업데이트
      appState.storeMarkers[store.SH_ID] = { // 마커 정보 업데이트
        marker: marker, // 마커 설정
        overlay: customOverlay, // 오버레이 설정
        store: store, // 가게 정보 설정
        coords: coords, // 좌표 설정
      };
    }
  });

  // 검색된 가게 수 표시
  if (stores.length > 0) { // 가게 데이터가 있는 경우
    appState.storeList.innerHTML = `<p>${stores.length}개의 가게가 검색되었습니다.</p>`; // 가게 목록 표시
  } else { // 가게 데이터가 없는 경우
    appState.storeList.innerHTML = "<p>검색된 가게가 없습니다.</p>"; // 가게 목록 표시
  }
}

function clearMarkers() { // 마커 제거 함수
  Object.values(appState.storeMarkers).forEach((markerInfo) => { // 각 마커 데이터 처리
    if (markerInfo.marker) { // 마커가 있는 경우
      markerInfo.marker.setMap(null); // 마커 제거
    }
    if (markerInfo.overlay) { // 오버레이가 있는 경우
      markerInfo.overlay.setMap(null); // 오버레이 제거
    }
  });
  appState.storeMarkers = {}; // 마커 정보 초기화
}

// 우측 정보 표시용 함수
function showStoreDetails(store) { // 가게 상세 정보 표시 함수
  const storeList = document.getElementById("storeList"); // 가게 목록 요소 가져오기

  const checkNull = (value) => { // 빈 값 체크 함수
    if (!value || value === "null" || value === "NULL" || value === "") { // 빈 값인 경우
      return "정보 없음"; // 정보 없음 반환
    }
    return value; // 값 반환
  };

  // 기본 정보 표시
  storeList.innerHTML = `
    ${
      store.SH_PHOTO // 가게 사진이 있는 경우
        ? `<img src="${store.SH_PHOTO}" alt="업소 사진" style="max-width:100%;height:auto;">`
        : "" // 가게 사진이 없는 경우
    }
    <h2>${store.SH_NAME}</h2>
    <p><strong class="label-green">업종:</strong> ${checkNull(store.INDUTY_CODE_SE_NAME)}</p>
    <p><strong class="label-green">주소:</strong> ${checkNull(store.SH_ADDR)}</p>
    <p><strong class="label-green">전화:</strong> ${checkNull(store.SH_PHONE)}</p>
    <p><strong class="label-green">찾아오시는 길:</strong> ${checkNull(store.SH_WAY)}</p>
    <p><strong class="label-green">업소정보:</strong> ${checkNull(store.SH_INFO)}</p>
    <p><strong class="label-green">자랑거리:</strong> ${checkNull(store.SH_PRIDE)}</p>
    <p><strong class="label-green">추천수:</strong> ${checkNull(store.SH_RCMN)}</p>
    <p><strong class="label-green">기준년월:</strong> ${checkNull(store.BASE_YM)}</p>
    <div id="menuInfo">
        <h3>대표 메뉴</h3>
        <p>메뉴 정보를 불러오는 중...</p>
    </div>
    <div class="review-section">
        <h3>리뷰</h3>
        ${
          appState.isLoggedIn
            ? `
            <form id="reviewForm" class="review-form" onsubmit="submitReview('${store.SH_ID}'); return false;">
              <textarea id="reviewText" placeholder="리뷰를 작성해주세요" required style="margin-bottom: 5px;"></textarea>
              <div class="image-upload-container" style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: -5px;">
                  <div style="margin-left: -10px; margin-top: 7px;">
                      <input type="file" id="reviewImage" accept="image/*" required style="display: none">
                      <label for="reviewImage" class="file-input-wrapper">
                          <span class="auth-btn">사진 선택 (필수)</span>
                      </label>
                      <p class="image-required-text" style="color: #ff4444; font-size: 12px; margin-top: 7px; margin-left: 10px;">
                          * 리뷰 작성 시 사진 첨부는 필수입니다
                      </p>
                  </div>
                  <button type="submit" class="review-submit-btn" style="margin-bottom: 10px;">작성 완료</button>
              </div>
              <img id="reviewPreview" class="review-preview-image" alt="리뷰 이미지 미리보기">
            </form>
        `
            : `
            <p class="login-required">리뷰를 작성하려면 <a href="#" onclick="login()">로그인</a>이 필요합니다.</p>
        `
        }
        <div id="reviewList" class="review-list">
            ${displayReviews(store.SH_ID)}
        </div>
    </div>
`;

  // 메뉴 정보 표시
  const menuDiv = document.getElementById("menuInfo"); // 메뉴 정보 요소 가져오기
  if (store.menuItems && store.menuItems.length > 0) { // 메뉴 데이터가 있는 경우
    const menuHtml = store.menuItems // 메뉴 데이터 처리
      .map( // 각 메뉴 데이터 처리
        (item) => ` 
  <div class="menu-item"> 
    <p><strong>메뉴:</strong> ${checkNull(item.IM_NAME)}</p> 
    <p><strong>가격:</strong> ${
      item.IM_PRICE ? item.IM_PRICE.toLocaleString() + "원" : "정보 없음" // 가격 표시
    }</p>
  </div>
`
      )
      .join("");

    menuDiv.innerHTML = `
<div class="menu-section">
  <h3>대표 메뉴</h3>
  <div class="menu-items-container">
    ${menuHtml}
      </div>
    </div>
  `;
  } else {
    menuDiv.innerHTML = `
    <div class="menu-section">
      <h3>대표 메뉴</h3>
      <p>등록된 메뉴 정보가 없습니다.</p>
    </div>
  `;
  }

  loadReviews(store.SH_ID);

  if (appState.isLoggedIn) {
    setupReviewImagePreview();
  }
}

function openModal(modalId) {
  document.getElementById(modalId).style.display = "block";
}

// 메뉴 정보 캐시 위한 전역 변수 추가
const menuCache = new Map();

// 메뉴 정보를 가져오는 함수 최적화
function fetchStoreMenu(storeId) {
  return new Promise((resolve, reject) => {
    // 캐시된 메뉴 정보가 있지 확인
    if (menuCache.has(storeId)) {
      resolve(menuCache.get(storeId));
      return;
    }

    const apiUrl = `http://openapi.seoul.go.kr:8088/684476426c746a643934416742415a/json/ListPriceModelStoreProductService/1/100/${storeId}`;

    fetch(apiUrl)
      .then((response) => response.json())
      .then((data) => {
        let menuItems = [];
        // 응답 구조 수정
        if (
          data.ListPriceModelStoreProductService &&
          data.ListPriceModelStoreProductService.row
        ) {
          menuItems = data.ListPriceModelStoreProductService.row;
          // 메뉴 정보를 캐시에 저장
          menuCache.set(storeId, menuItems);
        }
        resolve(menuItems);
      })
      .catch((error) => {
        console.error("메뉴 정보 가져오기 실패:", error);
        reject(error);
      });
  });
}

async function submitReview(storeId) {
  const reviewText = document.getElementById("reviewText").value;
  const imageFile = document.getElementById("reviewImage").files[0];

  if (!reviewText || !imageFile) {
    Swal.fire({
      icon: "warning",
      title: "입력 확인",
      text: "리뷰 내용과 사진은 필수입니다.",
      confirmButtonColor: "#4caf50",
    });
    return;
  }

  // 로그인 상태 및 토큰 확인
  const token = localStorage.getItem('token');
  if (!appState.isLoggedIn || !token) {
    Swal.fire({
      icon: 'error',
      title: '로그인이 필요합니다',
      text: '리뷰를 작성하려면 먼저 로그인해주세요.'
    });
    return;
  }

  try {
    const formData = new FormData();
    formData.append("store_id", storeId);
    formData.append("content", reviewText);
    formData.append("image", imageFile);

    const response = await fetch(`${SERVER_URL}/reviews`, {
      method: "POST",
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "리뷰 등록에 실패했습니다.");
    }

    // 리뷰 목록 새로고침
    await loadReviews(storeId);

    // 입력 폼 초기화
    document.getElementById("reviewText").value = "";
    document.getElementById("reviewImage").value = "";
    document.getElementById("reviewPreview").style.display = "none";

    Swal.fire({
      icon: "success",
      title: "리뷰 등록 완료!",
      text: "소중한 리뷰 감사합니다.",
    });
  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "리뷰 등록 실패",
      text: error.message,
    });
  }
}

// 특정 가게의 리뷰 목록을 불러오는 함수
async function loadReviews(storeId) {
  try {
    const response = await fetch(`${SERVER_URL}/reviews/store/${storeId}`);
    const result = await response.json();
    const reviews = result.data; // data 속성에서 리뷰 배열 추출

    const reviewList = document.getElementById("reviewList");

    if (!Array.isArray(reviews)) {
      console.error("서버 응답이 배열이 아닙니다:", reviews);
      reviewList.innerHTML = "<p>리뷰를 불러오는 중 오류가 발생했습니다.</p>";
      return;
    }

    if (reviews.length === 0) {
      reviewList.innerHTML = "<p>아직 작성된 리뷰가 없습니다.😥</p>";
      return;
    }

    reviewList.innerHTML = reviews
      .map(
        (review) => `
        <div class="review-item" id="review-${review.id}">
            <div class="review-header">
                <span class="review-author">${review.user_name}</span>
                <span class="review-date">${new Date(
                  review.created_at
                ).toLocaleDateString()}</span>
            </div>
            ${review.image ? `<img src="${review.image}" alt="리뷰 이미지" class="review-image">` : ""}
            <p class="review-text">${review.content}</p>
        </div>
    `
      )
      .join("");
  } catch (error) {
    console.error("리뷰 로딩 실패:", error);
    document.getElementById("reviewList").innerHTML = 
      "<p>리뷰를 불러오는 중 오류가 발생했습니다.</p>";
  }
}

// 이미지 미리보기 함수 추가
function setupReviewImagePreview() {
  const reviewImageInput = document.getElementById("reviewImage");
  const reviewPreview = document.getElementById("reviewPreview");

  reviewImageInput.addEventListener("change", function () {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        reviewPreview.src = e.target.result;
        reviewPreview.style.display = "block";
      };
      reader.readAsDataURL(file);
    } else {
      reviewPreview.style.display = "none";
    }
  });
}

// displayReviews 함수 수정
function displayReviews(storeId) {
  const reviews = JSON.parse(localStorage.getItem("reviews")) || {};
  const storeReviews = reviews[storeId] || [];

  if (storeReviews.length === 0) {
    return "<p>아직 작성된 리뷰가 없습니다.😥</p>";
  }

  return storeReviews
    .map(
      (review) => `
    <div class="review-item" id="review-${review.id}">
        <div class="review-header">
            <span class="review-author">${review.userName}</span>
            <span class="review-date">${new Date(
              review.date
            ).toLocaleDateString()}</span>
        </div>
        <img src="${review.image}" alt="리뷰 이미지" class="review-image">
        <p class="review-text">${review.text}</p>
        </div>
    `
    )
    .join("");
}

// 탭 전 함수 수정
function switchTab(tabName) {
  const profileSection = document.getElementById("profileSection");
  const reviewsSection = document.getElementById("reviewsSection");
  const tabs = document.querySelectorAll(".tab-btn");

  if (tabName === "profile") {
    profileSection.style.display = "block";
    reviewsSection.style.display = "none";
  } else {
    profileSection.style.display = "none";
    reviewsSection.style.display = "block";
  }

  //  버튼 상태 업데이트
  tabs.forEach((tab) => {
    if (tab.getAttribute("onclick").includes(tabName)) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });

  // 리뷰 탭인 경우 리뷰 목록 업데이트
  if (tabName === "reviews") {
    updateMyReviews();
  }
}

// 회원정보 업데이트
function updateProfileInfo() {
  document.getElementById("userName").textContent = appState.currentUser.name;
  document.getElementById("userEmail").textContent = appState.currentUser.email;
}

// 식사 시간 추천 경로 표시 함수
function showMealTimeRoute() {
  // 카테고리 선택 초기화
  appState.activeCategory = "";
  document.querySelectorAll(".category-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  // 기존 마커와 경로 초기화
  clearRouteMarkersAndLines();

  // 모든 가게 다시 표시
  fetchAndDisplayStores();

  const stores = Object.values(appState.storeMarkers)
    .filter((marker) => marker.store)
    .map((marker) => marker.store);

  // 음식점 카테고리 확장 및 시간대별 선호 카테고리 설정
  const foodCategories = {
    breakfast: ["001", "004"], // 한식, 기타외식업
    lunch: ["001", "002", "003", "004"], // 모든 카테고리
    dinner: ["001", "002", "003"], // 한식, 중식, 경양식/일식
  };

  // 시간대별 적합한 가게 필터링
  const timeBasedStores = { // 시간대별 가게 필터링
    breakfast: stores.filter((store) =>
      foodCategories.breakfast.includes(store.INDUTY_CODE_SE)
    ),
    lunch: stores.filter((store) =>
      foodCategories.lunch.includes(store.INDUTY_CODE_SE)
    ),
    dinner: stores.filter((store) =>
      foodCategories.dinner.includes(store.INDUTY_CODE_SE)
    ),
  };

  // 거리와 랜덤성을 고려한 가게 선택
  appState.mealTimeStores = selectOptimalStores(timeBasedStores); // 최적의 가게 선택

  // 선택된 가게 표시 및 나머지 숨기
  updateMapDisplay(); // 맵에 가게 표시

  // 경로 그리기
  drawRoute();

  // 우측 가게 목록 업데이트
  updateStoreList(); // 가게 목록 업데이트
}

// selectOptimalStores 함수 수정
function selectOptimalStores(timeBasedStores) {
  // 아침 식당 선택 (한식 위주)
  const breakfast = selectRandomStore(timeBasedStores.breakfast); // 랜덤 아침 식당 선택

  // 점심 식당 선택 (아침 식당과 적당히 떨어진 곳)
  const lunch = selectDistantStore( // 적당히 떨어진 점심 식당 선택
    timeBasedStores.lunch, // 점심 식당 목록
    [breakfast], // 아침 식당
    1.0, // 최소 거리
    3.0 // 최대 거리
  );

  // 저녁 식당 선택 (아침, 점심과 적당히 떨어진 곳)
  const dinner = selectDistantStore( // 적당히 떨어진 저녁 식당 선택
    timeBasedStores.dinner, // 저녁 식당 목록
    [breakfast, lunch], // 아침, 점심 식당
    1.0, // 최소 거리
    4.0 // 최대 거리
  );

  // 각 가게의 메뉴 정보를 캐시에서 가져오기
  const storesWithMenu = { // 메뉴 정보가 있는 가게 객체
    breakfast: addCachedMenuInfo(breakfast), // 아침 식당 메뉴 정보 캐시에서 가져오기
    lunch: addCachedMenuInfo(lunch), // 점심 식당 메뉴 정보 캐시에서 가져오기
    dinner: addCachedMenuInfo(dinner), // 저녁 식당 메뉴 정보 캐시에서 가져오기
  };

  return storesWithMenu; // 메뉴 정보가 있는 가게 객체 반환
}

// 새로운 함수: 캐시된 메뉴 정보를 가게 정보에 추가
function addCachedMenuInfo(store) {
  if (!store) return store; // 가게 정보가 없으면 그대로 반환

  // menuCache에서 해당 가게의 메뉴 정보 가져오기
  const cachedMenu = menuCache.get(store.SH_ID); 
  if (cachedMenu && cachedMenu.length > 0) {
    // 첫 번째 메뉴 정보를 가게 정보에 추가
    store.IM_NAME = cachedMenu[0].IM_NAME; // 메뉴 이름
    store.IM_PRICE = cachedMenu[0].IM_PRICE; // 메뉴 가격
  } else {
    store.IM_NAME = "정보 없음"; // 메뉴 이름 없음
    store.IM_PRICE = null; // 메뉴 가격 없음
  }

  return store; // 메뉴 정보가 있는 가게 객체 반환
}

function selectRandomStore(stores) {
  const randomIndex = Math.floor(Math.random() * stores.length); // 랜덤 인덱스 선택
  return stores[randomIndex]; // 랜덤 가게 반환
}

function selectDistantStore(stores, selectedStores, minDistance, maxDistance) {
  // 적합한 거리의 가게들 필터링
  const suitableStores = stores.filter((store) => { // 적합한 가게들 필터링
    const distances = selectedStores.map((selected) => // 선택된 가게들과의 거리 계산
      calculateDistance( // 거리 계산 함수
        store.latitude, // 가게 위도
        store.longitude, // 가게 경도
        selected.latitude, // 선택된 가게 위도
        selected.longitude // 선택된 가게 경도
      )
    );

    // 모든 선택된 가게와의 거리가 조건을 만족하는지 확인
    return distances.every( // 모든 거리가 조건을 만족하는지 확인
      (distance) => distance >= minDistance && distance <= maxDistance // 최소, 최대 거리 조건 확인
    );
  });

  // 적합한 가게가 없으면 원래 목록에서 랜덤 선택
  if (suitableStores.length === 0) {
    return selectRandomStore(stores); // 적합한 가게가 없으면 원래 목록에서 랜덤 선택
  }

  // 합 가게들 중에서 랜덤 선택
  return selectRandomStore(suitableStores); // 적합한 가게들 중에서 랜덤 선택
}

function updateMapDisplay() { // 맵에 가게 표시
  Object.values(appState.storeMarkers).forEach((markerInfo) => { // 모든 가게 마커 순회
    const isSelected = Object.values(appState.mealTimeStores).some( // 선택된 가게 확인
      (store) => store && store.SH_ID === markerInfo.store.SH_ID // 선택된 가게인지 확인
    );

    if (isSelected) { // 선택된 가게인 경우
      // 기존 마커 숨기기
      markerInfo.marker.setMap(null); // 마커 숨기기
      if (markerInfo.overlay) { // 오버레이가 있는 경우
        markerInfo.overlay.setMap(null);
      }

      // 시간대별 마커 스타일 설정
      let markerStyle;
      if (markerInfo.store.SH_ID === appState.mealTimeStores.breakfast.SH_ID) {
        markerStyle = {
          color: "#FFB300",
          text: "아침",
        };
      } else if (
        markerInfo.store.SH_ID === appState.mealTimeStores.lunch.SH_ID
      ) {
        markerStyle = {
          color: "#FF5252",
          text: "점심",
        };
      } else {
        markerStyle = {
          color: "#2196F3",
          text: "저녁",
        };
      }

      // 시간대만 표시하는 커스텀 오버레이 생성
      const customOverlay = new kakao.maps.CustomOverlay({ // 커스텀 오버레이 생성
        position: markerInfo.marker.getPosition(), // 마커 위치
        content: ` 
              <div class="custom-marker" style="
                  background-color: ${markerStyle.color};
                  color: white;
                  padding: 5px 15px;
                  border-radius: 5px;
                  font-weight: bold;
                  font-size: 13px;
                  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                  display: inline-block;
              ">
                  ${markerStyle.text}
              </div>
          `,
        map: appState.map, // 지도
        zIndex: 2, // 오버레이 순서
      });
      appState.routeMarkers.push(customOverlay); // 오버레이 추가
    } else {
      // 선택되지 않은 마커 숨기기
      markerInfo.marker.setMap(null); // 마커 숨기기
      if (markerInfo.overlay) { // 오버레이가 있는 경우
        markerInfo.overlay.setMap(null); // 오버레이 숨기기
      }
    }
  });
}

// 경로 그리기 함수에 스타일 개선 추가
function drawRoute() { // 경로 그리기
  if (
    !appState.mealTimeStores.breakfast || // 아침 식당 없음
    !appState.mealTimeStores.lunch || // 점심 식당 없음
    !appState.mealTimeStores.dinner // 저녁 식당 없음
  ) {
    return;
  }

  const points = [ // 경로 지점 배열
    new kakao.maps.LatLng( // 아침 식당 지점
      appState.mealTimeStores.breakfast.latitude, // 아침 식당 위도
      appState.mealTimeStores.breakfast.longitude // 아침 식당 경도
    ),
    new kakao.maps.LatLng( // 점심 식당 지점
      appState.mealTimeStores.lunch.latitude, // 점심 식당 위도
      appState.mealTimeStores.lunch.longitude // 점심 식당 경도
    ),
    new kakao.maps.LatLng( // 저녁 식당 지점
      appState.mealTimeStores.dinner.latitude, // 저녁 식당 위도
      appState.mealTimeStores.dinner.longitude // 저녁 식당 경도
    ),
  ];

  // 경로선 스타일 개선
  const polyline = new kakao.maps.Polyline({ // 경로선 생성
    path: points, // 경로 지점 배열
    strokeWeight: 4, // 선 두께
    strokeColor: "#4caf50", // 선 색상
    strokeOpacity: 0.8, // 선 투명도
    strokeStyle: "solid", // 선 스타일
  });

  polyline.setMap(appState.map); // 지도에 경로선 표시
  appState.routeLines.push(polyline); // 경로선 추가

  // 시대별 마커 라벨 개선
  const markerLabels = [ // 마커 라벨 배열
    { text: "아침", color: "#FFB300" }, // 아침 라벨
    { text: "점심", color: "#FF5252" }, // 점심 라벨
    { text: "저녁", color: "#2196F3" }, // 저녁 라벨
  ];

  points.forEach((point, index) => { // 모든 경로 지점 순회
    const marker = new kakao.maps.CustomOverlay({ // 커스텀 오버레이 생성
      position: point, // 지점 위치
      content: `
        <div class="route-marker" style="background-color: ${markerLabels[index].color}">
            ${markerLabels[index].text}
        </div>
    `,
      map: appState.map, // 지도
    });
    appState.routeMarkers.push(marker); // 마커 추가
  });

  // 경로가 모두 보이도록 지도 범위 조정
  const bounds = new kakao.maps.LatLngBounds(); // 지도 범위 객체 생성
  points.forEach((point) => bounds.extend(point)); // 모든 경로 지점 순회하며 범위 확장
  appState.map.setBounds(bounds); // 지도에 범위 설정
}

// 경로 표시 초기화 함수도 수정
function clearRouteDisplay() { // 경로 표시 초기화
  appState.routeLines.forEach((line) => line.setMap(null)); // 모든 경로선 숨기기
  appState.routeMarkers.forEach((marker) => marker.setMap(null)); // 모든 마커 숨기기
  appState.routeLines = []; // 경로선 배열 초기화
  appState.routeMarkers = []; // 마커 배열 초기화

  // 모든 마커와 오버레이 다시 표시
  Object.values(appState.storeMarkers).forEach((markerInfo, index) => { // 모든 가게 마커 순회
    markerInfo.marker.setMap(appState.map); // 마커 표시
    markerInfo.marker.setOpacity(1.0); // 마커 투명도 설정
    if (markerInfo.overlay) { // 오버레이가 있는 경우
      markerInfo.overlay.setMap(appState.map); // 오버레이 표시
    }

    // 마커 이미지 원래대로 복구
    const originalImage = new kakao.maps.MarkerImage( // 마커 이미지 생성
      "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_number_blue.png", // 이미지 URL
      new kakao.maps.Size(36, 37) // 이미지 크기
    );
    markerInfo.marker.setImage(originalImage); // 마커 이미지 설정
  });
}

// 두 지점 간의 거리 계산 함수 (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) { // 두 지점 간의 거리 계산
  const R = 6371; // 지구의 반경 (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180; // 위도 차이
  const dLon = ((lon2 - lon1) * Math.PI) / 180; // 경도 차이
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) + // 위도 차이
    Math.cos((lat1 * Math.PI) / 180) * // 위도 차이
      Math.cos((lat2 * Math.PI) / 180) * // 위도 차이
      Math.sin(dLon / 2) * // 경도 차이
      Math.sin(dLon / 2); // 경도 차이
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // 거리 계산
  return R * c;
}

// updateStoreList 함수 수정 (메뉴 정보 표시 부분)
function updateStoreList() { // 가게 목록 업데이트
  const storeList = document.getElementById("storeList"); // 가게 목록 요소 가져오기

  // 현재 테마 가져오기
  const theme = document.documentElement.getAttribute("data-theme"); // 테마 가져오기
  const textColor = theme === "dark" ? "#ffffff" : "#333"; // 텍스트 색상 설정

  // 각 가게의 메뉴 정보 가져오기
  const breakfastMenu = getStoreMenuInfo(appState.mealTimeStores.breakfast); // 아침 식당 메뉴 정보 가져오기
  const lunchMenu = getStoreMenuInfo(appState.mealTimeStores.lunch); // 점심 식당 메뉴 정보 가져오기
  const dinnerMenu = getStoreMenuInfo(appState.mealTimeStores.dinner); // 저녁 식당 메뉴 정보 가져오기

  storeList.innerHTML = `
    <div class="meal-time-list">
      <div class="meal-card">
          <h3>🌅 아침</h3>
          <div class="store-info">
              ${
                appState.mealTimeStores.breakfast.SH_PHOTO
                  ? `<img src="${appState.mealTimeStores.breakfast.SH_PHOTO}" 
                      alt="${appState.mealTimeStores.breakfast.SH_NAME}" 
                      style="width: 100%; height: 300px; object-fit: cover; border-radius: 5px; margin-bottom: 10px;">`
                  : ""
              }
              <strong>${appState.mealTimeStores.breakfast.SH_NAME}</strong>
              <p>${appState.mealTimeStores.breakfast.SH_ADDR}</p>
              </div>
              <div class="store-card-menu-section">
                <strong>${breakfastMenu}</strong>
              </div>
          </div>
      </div>
      <div class="meal-card">
          <h3>☀️ 점심</h3>
          <div class="store-info">
              ${
                appState.mealTimeStores.lunch.SH_PHOTO
                  ? `<img src="${appState.mealTimeStores.lunch.SH_PHOTO}" 
                      alt="${appState.mealTimeStores.lunch.SH_NAME}" 
                      style="width: 100%; height: 300px; object-fit: cover; border-radius: 5px; margin-bottom: 10px;">`
                  : ""
              }
              <strong>${appState.mealTimeStores.lunch.SH_NAME}</strong>
              <p>${appState.mealTimeStores.lunch.SH_ADDR}</p>
              <div class="store-card-menu-section">
                <strong>${lunchMenu}</strong>
              </div>
          </div>
      </div>
      <div class="meal-card">
          <h3>🌙 저녁</h3>
          <div class="store-info">
              ${
                appState.mealTimeStores.dinner.SH_PHOTO
                  ? `<img src="${appState.mealTimeStores.dinner.SH_PHOTO}" 
                      alt="${appState.mealTimeStores.dinner.SH_NAME}" 
                      style="width: 100%; height: 300px; object-fit: cover; border-radius: 5px; margin-bottom: 10px;">`
                  : ""
              }
              <strong>${appState.mealTimeStores.dinner.SH_NAME}</strong>
              <p>${appState.mealTimeStores.dinner.SH_ADDR}</p>
              <div class="store-card-menu-section">
                <strong>${dinnerMenu}</strong>
              </div>
          </div>
      </div>
    </div>
  `;
}

function getStoreMenuInfo(store) { // 가게 메뉴 정보 가져오기
  if (!store) return ''; // 가게 정보가 없는 경우 빈 문자열 반환

  // 현재 테마 가져오기
  const theme = document.documentElement.getAttribute("data-theme"); // 테마 가져오기
  const textColor = theme === "dark" ? "#333333" : "#333333"; // 텍스트 색상 설정

  return `
    <div class="store-card-menu-section" style="color: ${textColor};">
      ${store.IM_NAME ? `
        <div class="menu-info">
          <span>메뉴: </span>${store.IM_NAME}
        </div>
      ` : ''}
      ${store.IM_PRICE ? `
        <div class="menu-info">
          <span>가격: </span>${store.IM_PRICE}원
        </div>
      ` : ''}
    </div>
  `;
}
// null 체크 함수
function checkNull(value) { // null 체크
  return value || "정보 없음"; // 값이 null인 경우 "정보 없음" 반환
}

let mealTimeMarkers = []; // 전역 변수 추가

// 식사 시간대 마커 생성 함수 수정
function createMealTimeMarker(store, mealTime) { // 식사 시간대 마커 생성
  const position = new kakao.maps.LatLng(store.latitude, store.longitude); // 위치 설정
  const marker = appState.storeMarkers[store.SH_ID]?.marker; // 마커 가져오기

  // 마커 클릭 이벤트
  kakao.maps.event.addListener(marker, "click", function () { // 마커 클릭 이벤트 추가
    showStoreInfo(store); // 가게 정보 표시
    highlightMealTime(mealTime); // 식사 시간대 강조
  });

  // 시간대만 표시하는 작은 라벨
  const label = new kakao.maps.CustomOverlay({ // 커스텀 오버레이 생성
    position: position, // 위치 설정
    content: `<div class="meal-time-label">${ // 시간대 라벨 내용
      mealTime === "breakfast" ? "아침" : mealTime === "lunch" ? "점심" : "저녁" // 시간대 라벨 내용
    }</div>`, // 시간대 라벨 내용
    yAnchor: 2.5, // 오버레이 위치 설정
  });

  // 팝업 오버레이를 저장할 변수
  let currentInfoOverlay = null; // 현재 정보 오버레이

  // 마커 클릭 이벤트
  content.onclick = function () {
    // 기존 팝업이 있다면 제거
    if (currentInfoOverlay) {
      currentInfoOverlay.setMap(null);
    }

    // 새로운 정보창 생성
    const infoContent = document.createElement("div");
    infoContent.className = "store-info-popup";
    infoContent.innerHTML = `
  <div style="
      background: white;
      padding: 15px;
      border-radius: 5px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      max-width: 300px;
      position: relative;
      margin-bottom: 20px;
  ">
      ${
        store.SH_PHOTO
          ? `<img src="${store.SH_PHOTO}" alt="${store.SH_NAME}" 
           style="width: 100%; height: 150px; object-fit: cover; border-radius: 5px;">`
          : ""
      }
      <h3 style="margin: 10px 0; color: #333;">${store.SH_NAME}</h3>
      <p style="margin: 5px 0; color: #666; font-size: 13px;">${
        store.SH_ADDR
      }</p>
      <p style="margin: 5px 0; color: #666; font-size: 13px;">${
        store.SH_PHONE || "전화번호 없음"
      }</p>
  </div>
`;

    // 새로운 정보 오버레이 생성 및 표시
    currentInfoOverlay = new kakao.maps.CustomOverlay({
      content: infoContent,
      position: position,
      yAnchor: 2.5,
      zIndex: 3,
    });

    currentInfoOverlay.setMap(appState.map);
  };

  // 지도 클릭 시 팝업 닫기
  kakao.maps.event.addListener(appState.map, "click", function () {
    if (currentInfoOverlay) {
      currentInfoOverlay.setMap(null);
      currentInfoOverlay = null;
    }
  });

  return {
    marker: marker,
    label: label,
  };
}

function displayMealTimeRoute(stores) {
  console.log("경로 표시 시작");

  // 기존 경로 마커와 선 제거
  clearRouteMarkersAndLines();

  Object.entries(stores).forEach(([mealTime, store]) => {
    if (store && store.latitude && store.longitude) {
      const position = new kakao.maps.LatLng(store.latitude, store.longitude);

      // 마커 생성
      const marker = new kakao.maps.Marker({
        position: position,
        map: appState.map,
      });
      appState.routeMarkers.push(marker); // 마커 추가

      // 시간대 라벨 생성
      const labelContent = document.createElement("div");
      labelContent.className = "meal-time-marker";
      labelContent.innerHTML =
        mealTime === "breakfast"
          ? "아침"
          : mealTime === "lunch"
          ? "점심"
          : "저녁";

      const label = new kakao.maps.CustomOverlay({
        position: position,
        content: labelContent,
        yAnchor: 5,
      });
      label.setMap(appState.map);
      appState.routeMarkers.push(label); // 오버레이 가
    }
  });

  // 경로선 그리기
  drawRouteLine(stores);
}

function showStoreInfo(store, position) { // 가게 정보 표시
  if (currentInfoOverlay) { // 현재 정보 오버레이가 있는 경우
    currentInfoOverlay.setMap(null); // 제거
  }

  const theme = document.documentElement.getAttribute("data-theme"); // 테마 가져오기
  const backgroundColor = theme === "dark" ? "#2d2d2d" : "white"; // 배경색 설정
  const textColor = theme === "dark" ? "#ffffff" : "#333"; // 텍스트 색상 설정
  const subTextColor = theme === "dark" ? "#aaa" : "#666"; // 서브 텍스트 색상 설정

  const infoContent = document.createElement("div"); // 정보 오버레이 생성
  infoContent.className = "store-info-popup"; // 클래스 설정
  infoContent.innerHTML = `
    <div style="
        background: ${backgroundColor};
        padding: 15px;
        border-radius: 5px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        max-width: 300px;
        position: relative;
        margin-bottom: 20px;
    ">
        ${
          store.SH_PHOTO
            ? `<img src="${store.SH_PHOTO}" alt="${store.SH_NAME}" 
         style="width: 100%; height: 150px; object-fit: cover; border-radius: 5px;">`
            : ""
        }
        <h3 style="margin: 10px 0; color: ${textColor};">${store.SH_NAME}</h3>
        <p style="margin: 5px 0; color: ${subTextColor}; font-size: 13px;">${
    store.SH_ADDR
  }</p>
        <p style="margin: 5px 0; color: ${subTextColor}; font-size: 13px;">${
    store.SH_PHONE || "전화번호 없음"
  }</p>
    </div>
  `;

  currentInfoOverlay = new kakao.maps.CustomOverlay({
    content: infoContent,
    position: position,
    yAnchor: 2.5,
    zIndex: 3,
  });

  currentInfoOverlay.setMap(appState.map);
}

function clearRouteMarkersAndLines() {
  // 기존 경로 마커와 선 제거 
  appState.routeMarkers.forEach((item, index) => { // 경로 마커 제거
    console.log(`Removing item at index ${index}`);
    if (item.setMap) { // 마커가 있는 경우
      item.setMap(null); // 제거
    }
  });
  appState.routeMarkers = []; // 경로 마커 초기화

  // 경로선 제거
  appState.routeLines.forEach((line, index) => { // 경로선 제거
    console.log(`Removing route line at index ${index}`);
    if (line.setMap) { // 선이 있는 경우
      line.setMap(null); // 제거
    }
  });
  appState.routeLines = []; // 경로선 초기화

  // appState.mealTimeStores 초기화
  appState.mealTimeStores = { // 식사 시간대 정보 초기화
    breakfast: null, // 아침
    lunch: null, // 점심
    dinner: null, // 저녁
  };

  // 원래 마커의 오버레이 복원
  Object.values(appState.storeMarkers).forEach((markerInfo, index) => { // 마커 정보 반복
    if (markerInfo.overlay) { // 오버레이가 있는 경우
      markerInfo.overlay.setMap(appState.map); // 표시
    }
    if (markerInfo.marker) { // 마커가 있는 경우
      markerInfo.marker.setMap(appState.map); // 표시
    }
  });
}

let currentInfoOverlay = null; // 현재 정보 오버레이

// 다크모드 토글 함수
function toggleDarkMode() { // 다크모드 토글 함수
  const button = document.getElementById("darkModeToggle"); // 다크모드 토글 버튼 찾기
  if (!button) { // 버튼이 없는 경우
    console.error("다크 모드 토글 버튼을 찾을 수 없습니다."); 
    return;
  }
  const currentTheme = document.documentElement.getAttribute("data-theme"); // 현재 테마 가져오기
  const newTheme = currentTheme === "dark" ? "light" : "dark"; // 테마 변경

  document.documentElement.setAttribute("data-theme", newTheme); // 테마 설정
  localStorage.setItem("theme", newTheme); // 테마 저장
  updateDarkModeButton(newTheme); // 버튼 업데이트

  // 지도 스타일 업데이트 (선택사항)
  if (appState.map) { // 지도가 있는 경우
    updateMapStyle(newTheme); // 지도 스타일 업데이트
  }
}

// 다크모드 버튼 아이콘 업데이트
function updateDarkModeButton(theme) { // 다크모드 버튼 아이콘 업데이트 함수
  const button = document.getElementById("darkModeToggle"); // 버튼 찾기
  if (button) { // 버튼이 있는 경우
    button.textContent = theme === "dark" ? "☀️" : "🌙"; // 테마에 따른 아이콘 설정
    // 콘솔에 현재 테마 상태 출력 (디버깅용)
    console.log("Current theme:", theme);
  }
}

// 지도 스타일 업데이트 (선택사항)
function updateMapStyle(theme) { // 지도 스타일 업데이트 함수
  const mapTypes = { // 지도 스타일 타입
    light: kakao.maps.MapTypeId.NORMAL, // 라이트 모드
    dark: kakao.maps.MapTypeId.HYBRID, // 다크 모드
  };

  appState.map.setMapTypeId(mapTypes[theme]);
}

// Auth 관련 함수들
function login() { // 로그인 함수
  const authModal = document.getElementById("authModal"); // 인증 모달 찾기
  const loginForm = document.getElementById("loginForm"); // 로그인 폼 찾기
  const signupForm = document.getElementById("signupForm"); // 회원가입 폼 찾기
  
  loginForm.style.display = "block"; // 로그인 폼 표시
  signupForm.style.display = "none"; // 회원가입 폼 숨김
  authModal.style.display = "block"; // 인증 모달 표시
  
  document.getElementById("loginEmail").value = ""; // 로그인 이메일 초기화
  document.getElementById("loginPassword").value = ""; // 로그인 비밀번호 초기화
}

function signup() { // 회원가입 함수
  const authModal = document.getElementById("authModal"); // 인증 모달 찾기
  const loginForm = document.getElementById("loginForm"); // 로그인 폼 찾기
  const signupForm = document.getElementById("signupForm"); // 회원가입 폼 찾기
  
  loginForm.style.display = "none"; // 로그인 폼 숨김
  signupForm.style.display = "block"; // 회원가입 폼 표시
  authModal.style.display = "block"; // 인증 모달 표시
  
  document.getElementById("signupName").value = ""; // 회원가입 이름 초기화
  document.getElementById("signupEmail").value = ""; // 회원가입 이메일 초기화
  document.getElementById("signupPassword").value = ""; // 회원가입 비밀번호 초기화
  document.getElementById("signupPasswordConfirm").value = ""; // 회원가입 비밀번호 확인 초기화
}

function closeModal(modalId) { // 모달 닫기 함수
  document.getElementById(modalId).style.display = "none"; // 모달 숨김
}

// submitLogin 함수 수정
async function submitLogin() { // 로그인 제출 함수
  const email = document.getElementById("loginEmail").value; // 로그인 이메일 가져오기
  const password = document.getElementById("loginPassword").value; // 로그인 비밀번호 가져오기

  try { // 예외 처리
    const response = await fetch(`${SERVER_URL}/auth/login`, { // 로그인 API 호출
      method: 'POST', // POST 요청
      headers: { // 헤더 설정
        'Content-Type': 'application/json', // JSON 형식
      },
      body: JSON.stringify({ email, password }) // 바디 설정
    });

    if (!response.ok) { // 응답이 성공적이지 않은 경우
      throw new Error(`HTTP error! status: ${response.status}`); // 예외 발생
    }

    const data = await response.json(); // 응답 데이터 가져오기

    if (data.success) { // 성공적인 응답인 경우
      // 사용자 정보 저장 시 name 필드가 포함되어 있는지 확인
      const userData = { // 사용자 데이터
        user_id: data.data.user.user_id, // 사용자 ID
        name: data.data.user.name, // 서버에서 받은 이름
        email: data.data.user.email // 사용자 이메일
      };

      localStorage.setItem('token', data.data.token); // 토큰 저장
      localStorage.setItem('user', JSON.stringify(userData));
      
      appState.isLoggedIn = true;
      appState.user = userData;
      appState.currentUser = userData;
      
      closeModal('authModal');
      updateAuthButtons();

      // 현재 선택된 가게가 있다면 상세 정보를 다시 로드
      if (selectedStoreId) {
        const selectedStore = appState.storeMarkers[selectedStoreId]?.store;
        if (selectedStore) {
          showStoreDetails(selectedStore);
        }
      }

      Swal.fire({
        icon: 'success',
        title: '로그인 성공!',
        text: '즐거운 시간 되세요!🎈'
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: '로그인 실패.😥',
        text: data.message
      });
    }
  } catch (error) {
    console.error('로그인 에러:', error);
    Swal.fire({
      icon: 'error',
      title: '오류 발생',
      text: '서버와의 통신 중 문제가 발생했습니다.😰'
    });
  }
}

async function submitSignup() {
  const name = document.getElementById("signupName").value;
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;
  const passwordConfirm = document.getElementById("signupPasswordConfirm").value;

  if (password !== passwordConfirm) {
    Swal.fire({
      icon: 'error',
      title: '비밀번호 불일치',
      text: '비밀번호가 일치하지 않습니다.'
    });
    return;
  }

  try {
    const response = await fetch(`${SERVER_URL}/auth/signup`, {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json', 
        'Accept': 'application/json'
      },
      body: JSON.stringify({ name, email, password }) 
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      closeModal('authModal');
      Swal.fire({
        icon: 'success',
        title: '회원가입 성공!',
        text: '로그인해주세요! '
      });
      login();
    } else {
      Swal.fire({
        icon: 'error',
        title: '회원가입 실패',
        text: data.message
      });
    }
  } catch (error) {
    console.error('회원가입 에러:', error);
    Swal.fire({
      icon: 'error',
      title: '오류 발생',
      text: '서버와의 통신 중 문제가 발생했습니다.'
    });
  }
}

// logout 함수 수정
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  appState.isLoggedIn = false;
  appState.user = null;
  appState.currentUser = null;
  updateAuthButtons();

  if (selectedStoreId) {
    const selectedStore = appState.storeMarkers[selectedStoreId]?.store;
    if (selectedStore) {
      showStoreDetails(selectedStore);
    }
  }

  Swal.fire({
    icon: 'success',
    title: '로그아웃 되었습니다.',
    text: '다음에 또 만나요!✨',
    showConfirmButton: false,
    timer: 1500
  });
}

// updateAuthButtons 함수 수정
function updateAuthButtons() {
  const authButtons = document.getElementById('auth-buttons');
  if (appState.isLoggedIn && appState.user && appState.user.name) {
    authButtons.innerHTML = `
      <span class="user-name">${appState.user.name}님 환영합니다!</span>
      <button class="auth-btn" onclick="logout()">로그아웃</button>
    `;
  } else {
    authButtons.innerHTML = `
      <button class="auth-btn" onclick="login()">로그인</button>
      <button class="auth-btn" onclick="signup()">회원가입</button>
    `;
  }
}

// 전역 객체에 함수들 추가
window.auth = {
  login,
  signup,
  logout,
  closeModal,
  submitLogin,
  submitSignup,
  updateAuthButtons
};

// DOMContentLoaded 이벤트 리스너 수정
document.addEventListener('DOMContentLoaded', function() {
  const token = localStorage.getItem('token');
  const savedUser = localStorage.getItem('user');
  
  if (token && savedUser) {
    try {
      const user = JSON.parse(savedUser);
      // user 객체에 필수 필드가 있는지 확인
      if (!user.name || !user.email) {
        throw new Error('Invalid user data');
      }
      
      appState.isLoggedIn = true;
      appState.user = user;
      appState.currentUser = user;
      updateAuthButtons();
      
      // 토큰 유효성 백그라운드 검증
      fetch(`${SERVER_URL}/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      })
      .then(response => response.json())
      .then(data => {
        if (!data.success) {
          logout();
        }
      })
      .catch(error => {
        console.error('토큰 검증 에러:', error);
      });
    } catch (error) {
      console.error('사용자 정보 파싱 에러:', error);
      logout();
    }
  }
});
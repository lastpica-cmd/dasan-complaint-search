// DOM 요소들
const keywordInput = document.getElementById('keywordInput');
const searchBtn = document.getElementById('searchBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const resultSection = document.getElementById('resultSection');
const noResultSection = document.getElementById('noResultSection');
const errorSection = document.getElementById('errorSection');
const resultContent = document.getElementById('resultContent');
const errorMessage = document.getElementById('errorMessage');

// 검색 함수
async function performSearch() {
    const keyword = keywordInput.value.trim();
    
    if (!keyword) {
        alert('키워드를 입력해주세요.');
        keywordInput.focus();
        return;
    }
    
    // UI 상태 초기화
    hideAllSections();
    showLoading();
    
    try {
        console.log(`검색 시작: "${keyword}"`);
        
        const response = await fetch(`/api/search?keyword=${encodeURIComponent(keyword)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('검색 결과:', data);
        
        hideLoading();
        
        if (data.totalResults === 0) {
            showNoResult();
        } else {
            showResult(data);
        }
        
    } catch (error) {
        console.error('검색 에러:', error);
        hideLoading();
        showError(error.message);
    }
}

// 결과 표시 함수
function showResult(data) {
    const { keyword, totalResults, recommendedField, recommendedCount, allFields } = data;
    
    resultContent.innerHTML = `
        <div class="search-info">
            <p><strong>검색 키워드:</strong> "${keyword}"</p>
            <p><strong>총 검색 결과:</strong> ${totalResults}건</p>
        </div>
        
        <div class="recommendation">
            <div class="field">추천 분야:${recommendedField}</div>
            <p>${recommendedCount}건의 관련 민원이 있습니다</p>
        </div>
        
        <div class="all-fields">
            <h4>📊 분야별 분포</h4>
            <div class="stats">
                ${Object.entries(allFields)
                    .sort((a, b) => b[1] - a[1])
                    .map(([field, count]) => `
                        <div class="stat-item">
                            <div class="label">${field}</div>
                            <div class="value">${count}건</div>
                        </div>
                    `).join('')}
            </div>
        </div>
    `;
    
    resultSection.classList.remove('hidden');
}

// UI 상태 관리 함수들
function hideAllSections() {
    resultSection.classList.add('hidden');
    noResultSection.classList.add('hidden');
    errorSection.classList.add('hidden');
}

function showLoading() {
    loadingIndicator.classList.remove('hidden');
    searchBtn.disabled = true;
    searchBtn.textContent = '검색 중...';
}

function hideLoading() {
    loadingIndicator.classList.add('hidden');
    searchBtn.disabled = false;
    searchBtn.textContent = '🔍 검색';
}

function showNoResult() {
    noResultSection.classList.remove('hidden');
}

function showError(message) {
    errorMessage.textContent = message;
    errorSection.classList.remove('hidden');
}

// 키워드 태그 클릭 함수 (전역 함수로 정의)
function searchKeyword(keyword) {
    keywordInput.value = keyword;
    performSearch();
}

// 이벤트 리스너 등록
searchBtn.addEventListener('click', performSearch);

keywordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        performSearch();
    }
});

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('다산콜센터 민원 검색 앱이 시작되었습니다.');
    keywordInput.focus();
});

// 전역 에러 핸들러
window.addEventListener('error', (e) => {
    console.error('전역 에러:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('처리되지 않은 Promise 거부:', e.reason);
});

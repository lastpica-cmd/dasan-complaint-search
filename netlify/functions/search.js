const { createClient } = require('@supabase/supabase-js');

// 키워드 → 민원분야 매핑 테이블
const keywordMapping = {
  // 교통 관련
  '주차': '교통',
  '따릉이': '교통',
  '버스': '교통',
  '지하철': '교통',
  '택시': '교통',
  '교통': '교통',
  '도로': '교통',
  '신호등': '교통',
  '횡단보도': '교통',
  
  // 환경 관련
  '분리수거': '환경',
  '쓰레기': '환경',
  '재활용': '환경',
  '환경': '환경',
  '소음': '환경',
  '대기오염': '환경',
  '청소': '환경',
  '폐기물': '환경',
  
  // 세무 관련
  '세금': '세무',
  '세무': '세무',
  '납세': '세무',
  '과세': '세무',
  '지방세': '세무',
  '소득세': '세무',
  '재산세': '세무',
  '자동차세': '세무',
  
  // 복지 관련
  '복지': '복지',
  '수급': '복지',
  '기초생활': '복지',
  '장애인': '복지',
  '노인': '복지',
  '아동': '복지',
  '보육': '복지',
  '의료': '복지',
  
  // 주택 관련
  '주택': '주택',
  '임대': '주택',
  '전세': '주택',
  '월세': '주택',
  '부동산': '주택',
  '건축': '주택',
  '리모델링': '주택',
  
  // 일반행정 관련
  '민원': '일반행정',
  '증명서': '일반행정',
  '신청': '일반행정',
  '등록': '일반행정',
  '허가': '일반행정',
  '인허가': '일반행정'
};

// Netlify Functions용 검색 API
exports.handler = async (event, context) => {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // GET 요청만 허용
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Supabase 클라이언트 설정
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Supabase 설정이 누락되었습니다.' })
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 쿼리 파라미터에서 키워드 추출
    const keyword = event.queryStringParameters?.keyword;
    
    if (!keyword) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '키워드를 입력해주세요.' })
      };
    }
    
    console.log(`키워드 검색: "${keyword}"`);
    
    // 1단계: 키워드 매핑 확인 (우선순위)
    const mappedField = keywordMapping[keyword.toLowerCase()];
    
    if (mappedField) {
      // 키워드 매핑이 있는 경우, 해당 분야의 데이터 개수 조회
      const { data: mappedData, error: mappedError } = await supabase
        .from('complaints')
        .select('complaint_field')
        .eq('complaint_field', mappedField);
      
      if (!mappedError && mappedData && mappedData.length > 0) {
        console.log(`키워드 매핑 결과: "${keyword}" → "${mappedField}" (${mappedData.length}건)`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            keyword,
            totalResults: mappedData.length,
            recommendedField: mappedField,
            recommendedCount: mappedData.length,
            allFields: { [mappedField]: mappedData.length },
            mappingUsed: true
          })
        };
      }
    }
    
    // 2단계: 키워드 매핑이 없거나 실패한 경우, 기존 검색 방식 사용
    const { data, error } = await supabase
      .from('complaints')
      .select('complaint_field')
      .ilike('question_content', `%${keyword}%`);
    
    if (error) {
      console.error('검색 에러:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: '검색 중 오류가 발생했습니다.' })
      };
    }
    
    if (!data || data.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          keyword,
          totalResults: 0,
          recommendedField: null,
          message: '검색 결과가 없습니다.',
          mappingUsed: false
        })
      };
    }
    
    // 민원분야별 빈도 계산
    const fieldCounts = {};
    data.forEach(item => {
      const field = item.complaint_field;
      fieldCounts[field] = (fieldCounts[field] || 0) + 1;
    });
    
    // 가장 빈도가 높은 분야 찾기
    const sortedFields = Object.entries(fieldCounts)
      .sort((a, b) => b[1] - a[1]);
    
    const recommendedField = sortedFields[0][0];
    const recommendedCount = sortedFields[0][1];
    
    console.log(`검색 결과: ${data.length}건, 추천 분야: ${recommendedField} (${recommendedCount}건)`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        keyword,
        totalResults: data.length,
        recommendedField,
        recommendedCount,
        allFields: fieldCounts,
        mappingUsed: false
      })
    };
    
  } catch (error) {
    console.error('서버 에러:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '서버 오류가 발생했습니다.' })
    };
  }
};

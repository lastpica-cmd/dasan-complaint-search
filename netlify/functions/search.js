const { createClient } = require('@supabase/supabase-js');

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
    
    // 키워드가 포함된 질문내용 검색
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
          message: '검색 결과가 없습니다.'
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
        allFields: fieldCounts
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

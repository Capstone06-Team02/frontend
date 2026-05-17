import axios from 'axios';


export const sendOrderText = async (text: string, sessionId: string | null) => {
  const response = await axios.post('/api/order/speak', { 
    input: text,       // OrderRequest.java 필드명에 맞춤
    sessionId: sessionId // 이거 같이 보내야 백엔드가 기억
  });
  return response.data; 
};

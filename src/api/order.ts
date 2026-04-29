import axios from 'axios';

// 조영찬 님에게 물어본 진짜 주소를 여기에 적으세요! (예: /api/v1/order)
export const sendOrderText = async (text: string) => {
  const response = await axios.post('http://localhost:8080/api/v1/order', { 
    text: text // 조영찬 님이 정한 Key값(예: message, content 등)으로 수정 필요
  });
  return response.data; 
};
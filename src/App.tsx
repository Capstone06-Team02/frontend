import { useState, useRef } from 'react';
import { Mic, AudioLines } from 'lucide-react';
import { useVoice } from './hooks/useVoice'; 
import { sendOrderText } from './api/order'; 
import './index.css';

const App = () => {
  const [response, setResponse] = useState<string>('원하시는 메뉴를 말씀해주세요');
  const sessionIdRef = useRef<string | null>(null); 
  const { isListening, text, speak, startListening } = useVoice();

  // 텍스트 정규화 함수: 한글 숫자를 아라비아 숫자로 변환하고 공백 제거
  // 텍스트 정규화 함수: 한글 숫자를 아라비아 숫자로 변환하고 공백 제거
const normalizeText = (rawText: string) => {
  const numberMap: { [key: string]: string } = {
    '한': '1', '두': '2', '세': '3', '네': '4', '다섯': '5',
    '여섯': '6', '일곱': '7', '여덟': '8', '아홉': '9', '열': '10'
  };
  
  // 1. '두 개' -> '2 개' 로 변환
  let converted = rawText.replace(/한|두|세|네|다섯|여섯|일곱|여덟|아홉|열/g, match => numberMap[match]);
  
  // 2. 숫자와 '개' 사이의 모든 공백 제거 ("2 개" -> "2개")
  converted = converted.replace(/(\d)\s*(개)/g, '$1$2');
  
  // 3. (추가) "네" 오인식 보정: "44", "내", "데" 등으로 인식되면 "네"로 변경
  const trimmedText = converted.trim();
  if (trimmedText === "44" || trimmedText === "내" || trimmedText === "데") {
    converted = "네";
  }
  
  // 4. 백엔드가 단답형을 인식하지 못할 경우를 대비해 "주세요" 강제 추가 (임시 꼼수)
  // 단, "네"라고 대답할 때는 "주세요"를 붙이지 않도록 조건 확인
  if (/^\d+개$/.test(converted.trim())) {
    converted = converted.trim() + " 주세요";
  }
  
  return converted;
};

  const processOrder = async (input: string) => {
    try {
      // 변환 로직 실행
      const normalizedInput = normalizeText(input);
      console.log("서버로 보내는 최종 텍스트:", normalizedInput);

      // CRITICAL 수정: 'input' 대신 변환된 'normalizedInput'을 전송해야 합니다
      const data = await sendOrderText(normalizedInput, sessionIdRef.current);
      
      const botMessage = data.response; 
      
      if (data.sessionId) {
        sessionIdRef.current = data.sessionId;
        console.log("현재 세션 ID 유지 중:", sessionIdRef.current);
      }

      setResponse(botMessage);

      if (botMessage) {
        speak(botMessage, () => {
          // 약간의 지연(300ms)을 주어 이전 세션이 완전히 정리되게 함
          setTimeout(() => {
            if (data.slotsComplete === false) {
               handleStart(); 
            } 
            else if (data.slotsComplete === true && data.intent === "ORDER") {
               console.log("최종 확인을 위해 마이크를 켭니다.");
               handleStart(); 
            }
            else if (data.intent === "CONFIRM") {
               console.log("주문 완료됨");
            }
          }, 300); 
        });
      }

    } catch (error) {
      console.error("에러 발생:", error);
      setResponse("서버와 연결할 수 없습니다.");
      speak("서버와 연결할 수 없습니다.");
    }
  };

  const handleStart = () => {
    startListening((transcript: string) => {
      processOrder(transcript);
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">참슬기 식당 주문</h1>
      <p className="text-lg text-gray-600 mb-12 h-16">{response}</p>

      <button
        onClick={handleStart}
        disabled={isListening}
        className={`relative w-48 h-48 rounded-full flex items-center justify-center transition-all duration-300
          ${isListening ? 'bg-red-100 scale-110 shadow-[0_0_40px_rgba(239,68,68,0.4)]' : 'bg-blue-600 hover:bg-blue-700 shadow-xl active:scale-95'}`}
      >
        {isListening && <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-20"></span>}
        {isListening ? <AudioLines size={80} className="text-red-600" /> : <Mic size={80} className="text-white" />}
      </button>

      <div className="mt-12 bg-white p-4 rounded-2xl shadow-inner w-full max-w-sm">
        <p className="text-sm text-gray-400 mb-1">인식된 내용</p>
        <p className="text-xl font-medium text-blue-600 italic">
          {text ? `"${text}"` : "버튼을 누르고 말씀하세요"}
        </p>
      </div>
    </div>
  );
};

export default App;
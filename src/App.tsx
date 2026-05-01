import { useState } from 'react';
import { Mic, AudioLines } from 'lucide-react';
// 경로를 현재 src 폴더 기준으로 맞춥니다.
import { useVoice } from './hooks/useVoice'; 
import { sendOrderText } from './api/order'; 
import './index.css';

const App = () => {
  const [response, setResponse] = useState<string>('안녕하세요! 무엇을 도와드릴까요?');
  const { isListening, text, speak, startListening } = useVoice();

  // 백엔드와 대화하는 함수
 // 상단에 상태 추가
const [sessionId, setSessionId] = useState<string | null>(null);

const processOrder = async (input: string) => {
    try {
      // 1. 데이터를 먼저 가져옵니다.
      const data = await sendOrderText(input, sessionId);
      
      // 2. 백엔드에서 온 메시지를 변수에 확실히 담습니다.
      const botMessage = data.response; 
      
      if (data.sessionId) setSessionId(data.sessionId);
      setResponse(botMessage);

      // 3. 소리 내기 (botMessage가 확실히 있을 때만 실행)
      if (botMessage) {
        console.log("TTS 호출됨:", botMessage); // 확인용 로그
        speak(botMessage, () => {
          // 4. 소리가 다 끝나면 다음 동작 수행
          if (!data.slotsComplete) {
            handleStart(); 
          }
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
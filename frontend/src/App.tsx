import { useState } from 'react';
import { Mic, AudioLines } from 'lucide-react';
import { useVoice } from './hooks/useVoice';
import { sendOrderText } from './api/order'; // 아까 만든 order.ts
import './index.css';

const App = () => {
  const [response, setResponse] = useState<string>('안녕하세요! 무엇을 도와드릴까요?');
  const { isListening, text, speak, startListening } = useVoice();

  // 백엔드와 대화하는 함수
  const processOrder = async (input: string) => {
    try {
      // 1. 백엔드에 전송 (조영찬 님 API 호출)
      const data = await sendOrderText(input);
      
      // 2. 백엔드 응답 처리 (데이터 구조는 팀원과 맞춘 이름으로 수정!)
      const botMessage = data.answer || data.message;
      const shouldListenAgain = data.shouldListen || false;

      setResponse(botMessage);
      speak(botMessage, () => {
        if (shouldListenAgain) handleStart(); // 답변 후 필요하면 다시 듣기
      });
    } catch (error) {
      setResponse("서버와 연결할 수 없습니다.");
      speak("서버와 연결할 수 없습니다.");
    }
  };

  const handleStart = () => {
    startListening((transcript) => {
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
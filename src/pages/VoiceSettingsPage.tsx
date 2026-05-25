import { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import type { PageWithSpeechProps } from '../types/order';

const VOICE_STORAGE_KEY = 'voisk:selectedVoiceURI';

const getAvailableVoices = () => {
  const voices = window.speechSynthesis.getVoices();
  const koreanVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith('ko'));

  return koreanVoices.length > 0 ? koreanVoices : voices;
};

export const VoiceSettingsPage = ({ speak }: PageWithSpeechProps) => {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState(() => window.localStorage.getItem(VOICE_STORAGE_KEY) || '');
  const [voiceIndex, setVoiceIndex] = useState(0);

  const currentVoice = voices[voiceIndex];
  const voiceName = currentVoice ? `${currentVoice.name}, ${currentVoice.lang}` : '사용 가능한 목소리 없음';

  const selectedVoiceName = useMemo(() => {
    const selectedVoice = voices.find((voice) => voice.voiceURI === selectedVoiceURI);
    return selectedVoice ? `${selectedVoice.name}, ${selectedVoice.lang}` : '기본 목소리';
  }, [selectedVoiceURI, voices]);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = getAvailableVoices();
      setVoices(availableVoices);

      const storedIndex = availableVoices.findIndex((voice) => voice.voiceURI === selectedVoiceURI);
      if (storedIndex >= 0) {
        setVoiceIndex(storedIndex);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [selectedVoiceURI]);

  const moveVoice = (direction: 1 | -1) => {
    if (voices.length === 0) return;

    setVoiceIndex((current) => {
      const next = (current + direction + voices.length) % voices.length;
      const nextVoice = voices[next];
      speak(`${nextVoice.name}, ${nextVoice.lang}`);
      return next;
    });
  };

  const selectVoice = () => {
    if (!currentVoice) {
      speak('선택할 수 있는 목소리가 없습니다.');
      return;
    }

    window.localStorage.setItem(VOICE_STORAGE_KEY, currentVoice.voiceURI);
    setSelectedVoiceURI(currentVoice.voiceURI);
    speak(`${currentVoice.name} 목소리로 선택되었습니다.`);
  };

  return (
    <div className="h-[calc(100dvh+96px)] overflow-hidden bg-slate-50 text-slate-950">
      <div className="mx-auto flex h-dvh w-full max-w-[440px] flex-col px-5 pb-4 pt-[max(24px,env(safe-area-inset-top))]">
        <AppHeader
          onBack={() => {
            window.location.href = '/accessibility';
          }}
          subtitle="음성 안내 목소리"
          tone="light"
        />

        <section aria-live="polite" aria-atomic="true" className="mb-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-sm font-semibold text-slate-500">현재 선택된 목소리</p>
          <p className="mt-1 text-xl font-black text-sky-900">{selectedVoiceName}</p>
        </section>

        <section className="mb-3 flex-1 rounded-lg border-2 border-sky-700 bg-sky-100 p-5">
          <p className="text-sm font-semibold text-slate-600">확인 중인 목소리</p>
          <p className="mt-2 text-3xl font-black leading-tight">{voiceName}</p>
          <p className="mt-4 text-base font-semibold leading-snug text-slate-700">
            이전 또는 다음 목소리로 이동한 뒤, 미리 듣고 선택할 수 있습니다.
          </p>
        </section>

        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => moveVoice(-1)}
              onFocus={() => speak('이전 목소리 버튼')}
              aria-label="이전 목소리"
              className="flex min-h-14 items-center justify-center rounded-lg border border-slate-300 bg-white text-lg font-black focus:outline-none focus:ring-4 focus:ring-sky-300"
            >
              이전
            </button>
            <button
              type="button"
              onClick={() => moveVoice(1)}
              onFocus={() => speak('다음 목소리 버튼')}
              aria-label="다음 목소리"
              className="flex min-h-14 items-center justify-center rounded-lg border border-slate-300 bg-white text-lg font-black focus:outline-none focus:ring-4 focus:ring-sky-300"
            >
              다음
            </button>
          </div>

          <button
            type="button"
            onClick={() => speak('이 목소리는 Voisk 음성 안내에 사용됩니다.')}
            onFocus={() => speak('미리 듣기 버튼')}
            aria-label="미리 듣기"
            className="flex min-h-14 items-center justify-center rounded-lg border border-slate-300 bg-white text-lg font-black focus:outline-none focus:ring-4 focus:ring-sky-300"
          >
            미리 듣기
          </button>

          <button
            type="button"
            onClick={selectVoice}
            onFocus={() => speak('이 목소리 선택 버튼')}
            aria-label="이 목소리 선택"
            className="flex min-h-14 items-center justify-center rounded-lg bg-sky-700 text-lg font-black text-white focus:outline-none focus:ring-4 focus:ring-sky-300"
          >
            이 목소리 선택
          </button>
        </div>
      </div>
    </div>
  );
};

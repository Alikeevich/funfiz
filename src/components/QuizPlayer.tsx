import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast'; // <--- Импорт

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
}

interface QuizPlayerProps {
  questions: QuizQuestion[];
  onComplete: () => void;
}

export default function QuizPlayer({ questions, onComplete }: QuizPlayerProps) {
  const [answers, setAnswers] = useState<number[]>(new Array(questions.length).fill(-1));
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const selectOption = (qIndex: number, oIndex: number) => {
    if (submitted) return;
    const newAns = [...answers];
    newAns[qIndex] = oIndex;
    setAnswers(newAns);
  };

  const submitQuiz = () => {
    // Вместо alert используем toast.error
    if (answers.includes(-1)) {
        toast.error('Пожалуйста, ответьте на все вопросы!');
        return;
    }

    let correctCount = 0;
    questions.forEach((q, i) => {
        if (q.correctIndex === answers[i]) correctCount++;
    });

    setScore(correctCount);
    setSubmitted(true);

    if (correctCount === questions.length) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        toast.success('Идеально! Все верно!');
    } else if (correctCount >= questions.length / 2) {
        toast.success('Тест сдан!');
    } else {
        toast.error('Слабовато. Попробуй еще раз.');
    }
    
    // Если набрал >= 50%
    if (correctCount >= questions.length / 2) {
        onComplete();
    }
  };

  const retry = () => {
      setAnswers(new Array(questions.length).fill(-1));
      setSubmitted(false);
      setScore(0);
  };

  if (!questions || questions.length === 0) return <div>Тест пуст</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20">
      {submitted && (
          <div className={`mb-6 p-6 rounded-xl text-center border-2 ${score >= questions.length / 2 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="text-3xl font-bold mb-2">{score} / {questions.length}</div>
              <p className="text-gray-600">
                  {score === questions.length ? 'Превосходно! 🏆' : score >= questions.length / 2 ? 'Тест пройден ✅' : 'Нужно повторить материал ❌'}
              </p>
              <button onClick={retry} className="mt-4 flex items-center justify-center gap-2 mx-auto text-sm text-gray-500 hover:text-black">
                  <RefreshCw size={14}/> Пройти заново
              </button>
          </div>
      )}

      <div className="space-y-8">
        {questions.map((q, i) => (
            <div key={i} className="bg-white rounded-lg">
                <h3 className="text-lg font-medium text-gray-800 mb-4 flex gap-2">
                    <span className="text-gray-400">{i + 1}.</span> {q.question}
                </h3>
                <div className="space-y-2">
                    {q.options.map((opt, oIndex) => {
                        let style = "border-gray-200 hover:bg-gray-50";
                        if (submitted) {
                            if (oIndex === q.correctIndex) style = "bg-green-100 border-green-500 text-green-800";
                            else if (oIndex === answers[i] && oIndex !== q.correctIndex) style = "bg-red-100 border-red-500 text-red-800";
                            else style = "border-gray-100 opacity-50";
                        } else {
                            if (answers[i] === oIndex) style = "border-sky-500 bg-sky-50 ring-1 ring-sky-500";
                        }
                        return (
                            <button
                                key={oIndex}
                                onClick={() => selectOption(i, oIndex)}
                                disabled={submitted}
                                className={`w-full text-left p-3 rounded-lg border transition ${style}`}
                            >
                                {opt}
                            </button>
                        );
                    })}
                </div>
            </div>
        ))}
      </div>

      {!submitted && (
          <div className="mt-8 text-center">
              <button onClick={submitQuiz} className="bg-sky-600 text-white px-8 py-3 rounded-full font-bold text-lg shadow-lg hover:bg-sky-700 hover:-translate-y-1 transition">
                  Завершить тест
              </button>
          </div>
      )}
    </div>
  );
}
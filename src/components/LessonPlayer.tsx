import React, { useEffect, useState, useMemo } from 'react';
import { X, ExternalLink, AlertCircle, CheckCircle, FileText, Download, Image as ImageIcon, HelpCircle } from 'lucide-react';
import { Lesson } from '../types';
import Comments from './Comments';
import { supabase } from '../supabaseClient';
import QuizPlayer from './QuizPlayer';

// --- ИЗОЛИРОВАННЫЙ КОМПОНЕНТ КОНТЕНТА (NEVER RERENDERS) ---
// Мы вынесли его наружу и обернули в React.memo, чтобы он не перезагружался при вводе в чат
const LessonContent = React.memo(({ type, url, quizData, onComplete }: { type: string, url: string, quizData: any, onComplete: () => void }) => {
    
    // Хелпер для YouTube
    const getEmbedUrl = (link: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = link.match(regExp);
        return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : link;
    };

    switch (type) {
        case 'quiz':
            return (
                <div className="w-full min-h-full bg-gray-50 p-4">
                    <div className="max-w-3xl mx-auto bg-white p-6 rounded-xl shadow-sm mb-10">
                        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Проверка знаний</h2>
                        <QuizPlayer 
                            questions={quizData} 
                            onComplete={onComplete} 
                        />
                    </div>
                </div>
            );

        case 'empty':
            return (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <AlertCircle size={48} className="mb-2 opacity-50"/>
                    <p>Нет материалов.</p>
                </div>
            );
        
        case 'youtube':
            return (
                <iframe 
                    src={getEmbedUrl(url)} 
                    className="absolute inset-0 w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                    title="YouTube"
                />
            );

        case 'image':
            return (
                <div className="w-full min-h-full flex items-center justify-center bg-black p-4">
                    <img src={url} alt="Lesson material" className="max-h-full max-w-full object-contain" />
                </div>
            );

        case 'pdf':
            return (
                <iframe src={url} className="absolute inset-0 w-full h-full border-0" title="PDF Viewer" />
            );

        case 'file':
            return (
                <div className="w-full h-full flex items-center justify-center bg-gray-50 p-4">
                    <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-sm">
                        <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">Файл материала</h3>
                        <p className="text-gray-500 text-sm mb-6 break-words">Скачайте файл для просмотра.</p>
                        <a 
                            href={url} 
                            download
                            target="_blank"
                            rel="noreferrer"
                            className="bg-sky-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-sky-700 transition flex items-center justify-center gap-2"
                        >
                            <Download size={18} /> Скачать файл
                        </a>
                    </div>
                </div>
            );

        default: // website
            return (
                <iframe 
                    src={url} 
                    className="absolute inset-0 w-full h-full border-0"
                    title="Website"
                    loading="lazy"
                    // Важно: allow-scripts нужен для работы внешних сайтов
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
            );
    }
}, (prevProps, nextProps) => {
    // Эта функция говорит React'у: "Если URL и Тип не изменились - НЕ ПЕРЕРИСОВЫВАЙ"
    return prevProps.url === nextProps.url && prevProps.type === nextProps.type;
});


// --- ОСНОВНОЙ КОМПОНЕНТ ---
interface LessonPlayerProps {
  lesson: Lesson | null;
  onClose: () => void;
  onComplete: (lessonId: number) => void;
  isCompleted: boolean;
}

export default function LessonPlayer({ lesson, onClose, onComplete, isCompleted }: LessonPlayerProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const getUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setCurrentUserId(user.id);
            const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            if (data?.role === 'teacher') setIsAdmin(true);
        }
    };
    getUser();
  }, []);

  // Вычисляем тип (мемоизация)
  const type = useMemo(() => {
      if (!lesson) return 'empty';
      if (lesson.quiz_data && Array.isArray(lesson.quiz_data) && lesson.quiz_data.length > 0) return 'quiz';
      
      const link = lesson.content_link || '';
      if (!link) return 'empty';
      if (link.includes('youtube.com') || link.includes('youtu.be')) return 'youtube';
      
      const lower = link.toLowerCase();
      if (lower.match(/\.(jpeg|jpg|gif|png|webp)$/)) return 'image';
      if (lower.match(/\.pdf$/)) return 'pdf';
      if (lower.includes('course_materials')) return 'file'; 
      
      return 'website';
  }, [lesson]);

  if (!lesson) return null;

  const url = lesson.content_link || '';
  const isScrollable = type === 'quiz' || type === 'file' || type === 'image';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-7xl h-[100dvh] sm:h-[90vh] sm:rounded-lg shadow-2xl flex flex-col overflow-hidden">
        
        {/* Шапка */}
        <div className="flex justify-between items-center p-3 sm:p-4 border-b bg-gray-50 shrink-0 z-10">
          <div>
             <h3 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2 truncate max-w-[200px] sm:max-w-md">
                 {type === 'quiz' && <HelpCircle size={18} className="text-purple-600 shrink-0"/>}
                 {type === 'file' && <FileText size={16} className="text-gray-500 shrink-0"/>}
                 <span className="truncate">{lesson.title}</span>
                 {isCompleted && <span className="hidden sm:flex text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full items-center gap-1 shrink-0"><CheckCircle size={12}/> Выполнено</span>}
             </h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition">
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* ТЕЛО */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-gray-100 relative">
            
            {/* Левая часть: КОНТЕНТ */}
            <div className={`flex-1 flex flex-col relative border-r border-gray-200 ${type === 'quiz' ? 'bg-gray-50' : ''}`}>
                
                {/* Контейнер контента */}
                <div className={`flex-1 relative w-full ${isScrollable ? 'overflow-y-auto -webkit-overflow-scrolling-touch' : 'overflow-hidden'}`}>
                    {/* ВОТ ЗДЕСЬ МАГИЯ: Используем наш Memo-компонент */}
                    <LessonContent 
                        type={type} 
                        url={url} 
                        quizData={lesson.quiz_data} 
                        onComplete={() => onComplete(lesson.id)} 
                    />
                </div>
                
                {/* Футер */}
                {type !== 'quiz' && (
                    <div className="p-3 sm:p-4 bg-white border-t flex justify-between items-center shrink-0 z-10">
                        <div className="text-xs text-gray-500">
                            {url && (
                                <a href={url} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                                    <ExternalLink size={12}/> <span className="hidden sm:inline">Открыть оригинал</span><span className="sm:hidden">Ссылка</span>
                                </a>
                            )}
                        </div>
                        <button 
                            onClick={() => onComplete(lesson.id)}
                            disabled={isCompleted}
                            className={`flex items-center gap-2 px-4 sm:px-6 py-2 rounded font-medium transition text-sm sm:text-base ${
                                isCompleted 
                                ? 'bg-green-100 text-green-700 cursor-default' 
                                : 'bg-green-600 hover:bg-green-700 text-white shadow-lg'
                            }`}
                        >
                            {isCompleted ? <><CheckCircle size={18}/> <span className="hidden sm:inline">Урок пройден</span><span className="sm:hidden">Сдано</span></> : 'Завершить'}
                        </button>
                    </div>
                )}
            </div>

            {/* Правая часть: ЧАТ */}
            <div className="w-full lg:w-[350px] bg-white h-[40%] lg:h-full flex flex-col border-t lg:border-t-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] lg:shadow-none z-20">
                <Comments 
                    lessonId={lesson.id} 
                    currentUserId={currentUserId}
                    isAdmin={isAdmin}
                />
            </div>

        </div>
      </div>
    </div>
  );
}
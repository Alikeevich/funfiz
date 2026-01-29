import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Link as LinkIcon, Plus, LogOut, User, Search, Settings } from 'lucide-react';
import { supabase } from './supabaseClient';
import { Course } from './types';
import toast from 'react-hot-toast';
import Modal from './components/Modal';
import { useUserRole } from './useUserRole';

export default function CourseList() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  
  // Поиск и фильтрация
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { isAdmin } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourses();
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if(user) {
        const { data } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).single();
        if(data) setUserAvatar(data.avatar_url);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      const role = profile?.role;

      let data = [];

      if (role === 'teacher') {
          // Учитель: видит курсы, которые создал ОН
          const { data: teacherCourses } = await supabase
            .from('courses')
            .select('*')
            .eq('teacher_id', user.id) // <--- Фильтр
            .order('created_at', { ascending: false });
          
          data = teacherCourses || [];
      } else {
          // Ученик: видит курсы из таблицы enrollments
          // Получаем ID курсов
          const { data: enrollments } = await supabase
             .from('enrollments')
             .select('course_id')
             .eq('user_id', user.id);
          
          if (enrollments && enrollments.length > 0) {
              const courseIds = enrollments.map(e => e.course_id);
              
              const { data: studentCourses } = await supabase
                  .from('courses')
                  .select('*')
                  .in('id', courseIds) // <--- Берем только зачисленные
                  .order('created_at', { ascending: false });
              
              data = studentCourses || [];
          } else {
              data = []; // Никуда не зачислен
          }
      }

      setCourses(data);
    } catch (error) {
      toast.error('Не удалось загрузить курсы');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle.trim()) return;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast.error('Вы не авторизованы');
            navigate('/auth');
            return;
        }

        const { error } = await supabase
            .from('courses')
            .insert([{ title: newCourseTitle, teacher_id: user.id }]);

        if (error) throw error;

        toast.success('Курс успешно создан!');
        setNewCourseTitle('');
        setIsModalOpen(false);
        fetchCourses();
    } catch (error: any) {
        toast.error('Ошибка: ' + error.message);
    }
  };

  const deleteCourse = async (id: number) => {
      const { error } = await supabase.from('courses').delete().eq('id', id);
      if (error) {
          toast.error('Не удалось удалить курс');
      } else {
          toast.success('Курс удален');
          fetchCourses();
      }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  // Копирование ссылки
  const copyCourseLink = (courseId: number) => {
      const link = `${window.location.origin}/course/${courseId}`;
      navigator.clipboard.writeText(link);
      toast.success('Ссылка скопирована!');
  };

  // Фильтрация
  const filteredCourses = courses.filter(c => 
      c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto p-6 font-sans text-gray-700">
      
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Создание нового курса"
      >
        <form onSubmit={handleCreateCourse} className="flex flex-col gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Название класса / курса</label>
                <input 
                    autoFocus
                    type="text" 
                    className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-sky-500 outline-none"
                    placeholder="Например: 10 сынып"
                    value={newCourseTitle}
                    onChange={(e) => setNewCourseTitle(e.target.value)}
                />
            </div>
            <button className="bg-sky-600 text-white py-2 rounded hover:bg-sky-700 transition font-medium">
                Создать
            </button>
        </form>
      </Modal>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-light text-gray-800">FUNFIZ</h1>
        
        <div className="flex items-center gap-4">
            <Link to="/profile" className="flex items-center gap-2 hover:bg-gray-100 p-1 pr-3 rounded-full transition group" title="Личный кабинет">
                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-gray-300">
                    {userAvatar ? (
                        <img src={userAvatar} className="w-full h-full object-cover" alt="avatar" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                            <User size={16}/>
                        </div>
                    )}
                </div>
                <span className="text-sm text-gray-600 group-hover:text-sky-600 font-medium">Профиль</span>
            </Link>

            <div className="h-6 w-px bg-gray-300"></div>

            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1 transition">
                <LogOut size={16}/> Выйти
            </button>
        </div>
      </div>
        
      {/* МЕНЮ И ПОИСК */}
      <div className="flex flex-col sm:flex-row border-b border-gray-300 mb-6 gap-2 sm:gap-0">
        <button className="px-4 py-2 bg-sky-600 text-white font-medium rounded-t-sm">
          Мои курсы
        </button>
        
        {/* Кнопка "Категории" теперь включает ПОИСК */}
        <button 
            onClick={() => setShowSearch(!showSearch)}
            className={`px-4 py-2 hover:bg-gray-100 flex items-center gap-2 transition ${showSearch ? 'bg-gray-100 text-sky-600' : 'text-sky-600'}`}
        >
            <Search size={16}/> {showSearch ? 'Скрыть поиск' : 'Поиск'}
        </button>

        {/* Кнопка "Общие параметры" ведет в профиль */}
        <Link 
            to="/profile"
            className="px-4 py-2 text-sky-600 hover:bg-gray-100 flex items-center gap-2"
        >
             <Settings size={16}/> Настройки
        </Link>
      </div>

      {/* Поле поиска (появляется при клике) */}
      {showSearch && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-2">
              <input 
                  type="text" 
                  autoFocus
                  placeholder="Поиск курса по названию..." 
                  className="w-full border p-3 rounded shadow-sm focus:ring-2 focus:ring-sky-500 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
              />
          </div>
      )}

      {isAdmin && (
        <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-sm flex items-center gap-2 mb-6 font-medium text-sm transition-colors"
        >
            <Plus size={16} /> Создать курс
        </button>
      )}

      <div className="bg-white border border-gray-200 rounded-sm min-h-[200px]">
        <div className="p-3 bg-gray-50 border-b border-gray-200 text-gray-500 text-sm flex justify-between">
          <span>Список курсов</span>
          <span className="bg-gray-200 px-2 rounded-full text-xs flex items-center">{filteredCourses.length}</span>
        </div>
        
        {loading ? (
            <div className="p-4 text-center text-gray-400">Загрузка...</div>
        ) : (
            <div>
            {filteredCourses.length === 0 && (
                <div className="p-8 text-center text-gray-400">
                    {searchTerm ? 'Ничего не найдено' : 'Курсов пока нет.'}
                </div>
            )}
            {filteredCourses.map((course) => (
                <div key={course.id} className="flex items-center justify-between p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors group">
                <div>
                    <Link to={`/course/${course.id}`} className="text-lg text-sky-600 hover:underline cursor-pointer font-medium">
                    {course.title}
                    </Link>
                </div>
                
                {/* Элементы управления */}
                {isAdmin && (
                    <div className="flex items-center gap-6 text-sm text-gray-500 opacity-80 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-1 cursor-pointer hover:text-sky-600">
                            <Pencil size={16} />
                        </div>
                        
                        {/* РАБОЧАЯ КНОПКА ССЫЛКИ */}
                        <button 
                            onClick={() => copyCourseLink(course.id)}
                            className="flex items-center gap-1 cursor-pointer text-sky-600 hover:underline hover:bg-sky-50 px-2 py-1 rounded transition"
                        >
                            <LinkIcon size={14} /> Ссылка
                        </button>

                        <button 
                            onClick={() => deleteCourse(course.id)}
                            className="flex items-center gap-1 text-sky-600 hover:text-red-500 transition-colors hover:bg-red-50 px-2 py-1 rounded"
                        >
                            <Trash2 size={14} /> Удалить
                        </button>
                    </div>
                )}
                </div>
            ))}
            </div>
        )}
      </div>
    </div>
  );
}
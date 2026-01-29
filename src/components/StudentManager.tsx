import React, { useEffect, useState } from 'react';
import { User, UserPlus, Trash2, Search, X } from 'lucide-react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

interface Props {
  courseId: string;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

export default function StudentManager({ courseId }: Props) {
  const [enrolledStudents, setEnrolledStudents] = useState<Profile[]>([]);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEnrolled();
  }, [courseId]);

  // 1. Загружаем тех, кто УЖЕ на курсе
  const fetchEnrolled = async () => {
    const { data, error } = await supabase
      .from('enrollments')
      .select('user_id, profiles(id, full_name, email, avatar_url)')
      .eq('course_id', courseId);
    
    if (data) {
      // @ts-ignore
      setEnrolledStudents(data.map(d => d.profiles));
    }
  };

  // 2. Поиск новых людей
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setLoading(true);

    // Ищем среди студентов (role = student)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student') 
      .ilike('email', `%${searchTerm}%`) // Поиск по email
      .limit(5);

    // Убираем из результатов тех, кто уже добавлен
    const filtered = data?.filter(u => !enrolledStudents.find(e => e.id === u.id)) || [];
    
    setSearchResults(filtered);
    setLoading(false);
    if (filtered.length === 0) toast('Пользователи не найдены');
  };

  // 3. Добавление
  const addStudent = async (userId: string) => {
    const { error } = await supabase
      .from('enrollments')
      .insert([{ course_id: parseInt(courseId), user_id: userId }]);

    if (error) {
        toast.error('Ошибка добавления');
    } else {
        toast.success('Ученик добавлен!');
        setSearchResults(searchResults.filter(s => s.id !== userId)); // Убрать из поиска
        fetchEnrolled(); // Обновить список
    }
  };

  // 4. Удаление
  const removeStudent = async (userId: string) => {
    if(!confirm('Исключить ученика из курса?')) return;
    
    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('course_id', courseId)
      .eq('user_id', userId);

    if (!error) {
        toast.success('Ученик исключен');
        fetchEnrolled();
    }
  };

  return (
    <div className="h-[70vh] flex flex-col">
      {/* ПОИСК */}
      <div className="bg-gray-50 p-4 rounded-lg border mb-6">
          <h3 className="text-sm font-bold text-gray-500 mb-2 uppercase">Добавить ученика</h3>
          <form onSubmit={handleSearch} className="flex gap-2">
              <input 
                type="text" 
                placeholder="Email ученика..." 
                className="flex-1 border p-2 rounded text-sm outline-none focus:border-sky-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button className="bg-sky-600 text-white p-2 rounded hover:bg-sky-700">
                  <Search size={18}/>
              </button>
          </form>

          {/* Результаты поиска */}
          {searchResults.length > 0 && (
              <div className="mt-2 bg-white border rounded shadow-sm max-h-40 overflow-y-auto">
                  {searchResults.map(user => (
                      <div key={user.id} className="flex justify-between items-center p-2 hover:bg-gray-50 border-b last:border-0">
                          <div className="flex items-center gap-2">
                              <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                                  {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover"/> : <User size={12}/>}
                              </div>
                              <div className="text-sm">
                                  <div className="font-medium">{user.full_name}</div>
                                  <div className="text-xs text-gray-400">{user.email}</div>
                              </div>
                          </div>
                          <button onClick={() => addStudent(user.id)} className="text-green-600 hover:bg-green-50 p-1 rounded">
                              <UserPlus size={18}/>
                          </button>
                      </div>
                  ))}
              </div>
          )}
      </div>

      {/* СПИСОК ЗАЧИСЛЕННЫХ */}
      <div className="flex-1 overflow-y-auto">
          <h3 className="text-sm font-bold text-gray-500 mb-2 uppercase">Зачисленные ({enrolledStudents.length})</h3>
          {enrolledStudents.length === 0 ? (
              <div className="text-gray-400 text-sm text-center py-4">На этом курсе пока никого нет</div>
          ) : (
              <div className="space-y-2">
                  {enrolledStudents.map(student => (
                      <div key={student.id} className="flex justify-between items-center p-3 border rounded bg-white hover:shadow-sm transition">
                          <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                                  {student.avatar_url ? <img src={student.avatar_url} className="w-full h-full object-cover"/> : <User size={16}/>}
                              </div>
                              <div>
                                  <div className="font-medium text-gray-800">{student.full_name || 'Без имени'}</div>
                                  <div className="text-xs text-gray-400">{student.email}</div>
                              </div>
                          </div>
                          <button 
                            onClick={() => removeStudent(student.id)}
                            className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded transition"
                            title="Исключить"
                          >
                              <Trash2 size={16}/>
                          </button>
                      </div>
                  ))}
              </div>
          )}
      </div>
    </div>
  );
}
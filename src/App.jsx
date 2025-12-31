import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Search, Plus, Book, Trash2, Loader2, Languages, ArrowRight, ChevronDown, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const App = () => {
    const [word, setWord] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [savedWords, setSavedWords] = useState([]);
    const [view, setView] = useState('search'); // 'search' or 'library'
    const [status, setStatus] = useState('');

    useEffect(() => {
        fetchSavedWords();
    }, []);

    const fetchSavedWords = async () => {
        const { data, error } = await supabase
            .from('vocabulary')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) console.error('Error fetching words:', error);
        else setSavedWords(data || []);
    };

    const generateExplanation = async () => {
        if (!word) return;
        setLoading(true);
        setData(null);
        setStatus('AIが解析中...');

        try {
            const response = await fetch('/.netlify/functions/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word }),
            });
            const result = await response.json();
            if (result.error) throw new Error(result.error);
            setData(result);
        } catch (error) {
            console.error('Generation failed:', error);
            alert('解説の生成に失敗しました。');
        } finally {
            setLoading(false);
            setStatus('');
        }
    };

    const saveWord = async () => {
        if (!data) return;
        setLoading(true);
        setStatus('保存中...');

        try {
            const { error } = await supabase
                .from('vocabulary')
                .insert([{
                    word: data.word,
                    data: data,
                    user_id: (await supabase.auth.getUser()).data.user?.id || null
                }]);

            if (error) throw error;

            alert('単語帳に保存しました！');
            fetchSavedWords();
        } catch (error) {
            console.error('Save failed:', error);
            alert('保存に失敗しました。');
        } finally {
            setLoading(false);
            setStatus('');
        }
    };

    const deleteWord = async (id) => {
        if (!confirm('削除してよろしいですか？')) return;
        const { error } = await supabase.from('vocabulary').delete().match({ id });
        if (error) console.error('Delete failed:', error);
        else fetchSavedWords();
    };

    return (
        <div className="max-w-2xl mx-auto px-6 py-12 min-h-screen">
            {/* Navigation */}
            <nav className="flex justify-between items-center mb-12">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
                    <Languages className="w-8 h-8 text-indigo-500" />
                    Chinese AI Coach
                </h1>
                <div className="flex bg-white/5 p-1 rounded-xl">
                    <button
                        onClick={() => setView('search')}
                        className={`px-4 py-2 rounded-lg transition-all ${view === 'search' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Search className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setView('library')}
                        className={`px-4 py-2 rounded-lg transition-all ${view === 'library' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Book className="w-5 h-5" />
                    </button>
                </div>
            </nav>

            <main>
                {view === 'search' ? (
                    <div className="space-y-8">
                        {/* Search Input */}
                        <div className="relative group">
                            <input
                                type="text"
                                value={word}
                                onChange={(e) => setWord(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && generateExplanation()}
                                placeholder="調べたい中国語を入力..."
                                className="w-full glass-input text-xl pr-32"
                            />
                            <button
                                onClick={generateExplanation}
                                disabled={loading}
                                className="absolute right-2 top-2 btn-primary py-2 px-6 flex items-center gap-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '検索'}
                            </button>
                        </div>

                        {/* Results */}
                        <AnimatePresence mode="wait">
                            {loading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="flex flex-col items-center justify-center py-20 space-y-4"
                                >
                                    <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                                    <p className="text-indigo-400 font-medium animate-pulse">{status}</p>
                                </motion.div>
                            )}

                            {data && !loading && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-6"
                                >
                                    <div className="premium-card p-8 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-6">
                                            <button onClick={saveWord} className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-2 text-sm font-semibold">
                                                <Plus className="w-5 h-5" /> 単語帳に保存
                                            </button>
                                        </div>

                                        <div className="mb-8">
                                            <div className="flex items-baseline gap-4 mb-2">
                                                <h2 className="text-5xl font-bold">{data.word}</h2>
                                                <span className="text-2xl text-slate-400 font-medium">{data.pinyin}</span>
                                            </div>
                                            <span className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-sm font-bold border border-indigo-500/30">
                                                {data.part_of_speech}
                                            </span>
                                        </div>

                                        <div className="grid gap-6 md:grid-cols-2 mb-8">
                                            <div className="space-y-2">
                                                <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">原義</h3>
                                                <p className="text-lg leading-relaxed">{data.definitions.original}</p>
                                            </div>
                                            <div className="space-y-2">
                                                <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">派生義 / 文脈</h3>
                                                <p className="text-lg leading-relaxed">{data.definitions.derived}</p>
                                                <p className="text-sm text-slate-400">{data.definitions.context}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">例文</h3>
                                            {data.examples.map((ex, i) => (
                                                <div key={i} className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-2">
                                                    <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold">
                                                        <ArrowRight className="w-3 h-3" /> {ex.scenario}
                                                    </div>
                                                    <p className="text-xl font-medium">{ex.zh}</p>
                                                    <p className="text-slate-400">{ex.jp}</p>
                                                    {ex.note && <p className="text-xs text-slate-500 italic">💡 {ex.note}</p>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Synonyms & Tips */}
                                    <div className="grid gap-6 md:grid-cols-2">
                                        <div className="premium-card p-6">
                                            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-4">類義語</h3>
                                            <div className="space-y-3">
                                                {data.synonyms.map((syn, i) => (
                                                    <div key={i} className="flex justify-between items-center border-b border-white/5 pb-2">
                                                        <div>
                                                            <span className="font-bold mr-2">{syn.word}</span>
                                                            <span className="text-xs text-slate-400">{syn.pinyin}</span>
                                                        </div>
                                                        <span className="text-sm text-slate-300">{syn.nuance}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="premium-card p-6">
                                            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-4">使い分けのコツ</h3>
                                            <p className="text-sm leading-relaxed text-slate-300">{data.usage_tips}</p>
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                {data.summary.map((tag, i) => (
                                                    <span key={i} className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded">#{tag}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-4"
                    >
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Book className="w-6 h-6 text-indigo-500" />
                            保存した単語 ({savedWords.length})
                        </h2>

                        <div className="grid gap-4">
                            {savedWords.length === 0 ? (
                                <div className="text-center py-20 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                    <p className="text-slate-500">保存された単語はありません。</p>
                                </div>
                            ) : (
                                savedWords.map((item) => (
                                    <div key={item.id} className="premium-card p-6 flex justify-between items-center group hover:bg-white/10 transition-all">
                                        <div>
                                            <div className="flex items-baseline gap-3 mb-1">
                                                <span className="text-2xl font-bold">{item.word}</span>
                                                <span className="text-slate-400">{item.data.pinyin}</span>
                                            </div>
                                            <p className="text-slate-300 text-sm line-clamp-1">{item.data.definitions.original}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    setData(item.data);
                                                    setView('search');
                                                }}
                                                className="btn-ghost"
                                            >
                                                表示
                                            </button>
                                            <button
                                                onClick={() => deleteWord(item.id)}
                                                className="p-2 text-slate-600 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </main>

            {/* Footer */}
            <footer className="mt-20 text-center text-slate-600 text-xs">
                <p>&copy; 2024 Chinese AI Coach. Powered by GPT-4o & Supabase.</p>
            </footer>
        </div>
    );
};

export default App;

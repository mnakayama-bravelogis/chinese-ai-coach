import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Search, Plus, Book, Trash2, Loader2, Languages, ArrowRight, ChevronDown, CheckCircle2, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const App = () => {
    const [word, setWord] = useState('');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [savedWords, setSavedWords] = useState([]);
    const [view, setView] = useState('search'); // 'search' or 'library'
    const [status, setStatus] = useState('');
    const [expandedMeanings, setExpandedMeanings] = useState({});

    const toggleMeaning = (idx) => {
        setExpandedMeanings(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    const speak = (text) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    };

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

        // キャッシュチェック: 保存済み単語にあれば即座に表示
        const cached = savedWords.find(s => s.word === word);
        if (cached) {
            setData(cached.data);
            setLoading(false);
            setStatus('');
            return;
        }

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
        <div className="max-w-2xl mx-auto px-4 py-4 min-h-screen">
            {/* Navigation */}
            <nav className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold text-gold flex items-center gap-2">
                    <Languages className="w-6 h-6 text-scarlet" />
                    Chinese AI Coach
                </h1>
                <div className="flex bg-ivory p-1 rounded-xl shadow-sm border border-zinc-300/50">
                    <button
                        onClick={() => setView('search')}
                        className={`px-4 py-1.5 rounded-lg transition-all ${view === 'search' ? 'bg-scarlet text-white shadow-md' : 'text-gold hover:text-scarlet'}`}
                    >
                        <Search className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setView('library')}
                        className={`px-4 py-1.5 rounded-lg transition-all ${view === 'library' ? 'bg-scarlet text-white shadow-md' : 'text-gold hover:text-scarlet'}`}
                    >
                        <Book className="w-4 h-4" />
                    </button>
                </div>
            </nav>

            <main>
                {view === 'search' ? (
                    <div className="space-y-4">
                        {/* Search Input */}
                        <div className="relative group">
                            <input
                                type="text"
                                value={word}
                                onChange={(e) => setWord(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && generateExplanation()}
                                placeholder="中国語を入力..."
                                className="w-full glass-input text-lg pr-28 py-2"
                            />
                            <button
                                onClick={generateExplanation}
                                disabled={loading}
                                className="absolute right-1.5 top-1.5 btn-primary py-1.5 px-4 text-sm flex items-center gap-2"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '検索'}
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
                                    <div className="w-16 h-16 border-4 border-scarlet/10 border-t-scarlet rounded-full animate-spin" />
                                    <p className="text-scarlet font-medium animate-pulse">{status}</p>
                                </motion.div>
                            )}

                            {data && !loading && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-4"
                                >
                                    <div className="premium-card p-5 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4">
                                            <button onClick={saveWord} className="text-scarlet hover:text-scarlet/80 transition-colors flex items-center gap-1.5 text-xs font-semibold">
                                                <Plus className="w-4 h-4" /> 保存
                                            </button>
                                        </div>

                                        <div className="mb-4">
                                            <div className="flex items-baseline gap-2 mb-1">
                                                <h2 className="text-2xl font-bold text-zinc-800">{data.word}</h2>
                                                <span
                                                    onClick={() => speak(data.word)}
                                                    className="text-lg text-zinc-500 font-medium cursor-pointer hover:text-scarlet transition-all flex items-center gap-1"
                                                >
                                                    {data.pinyin}
                                                    <Volume2 className="w-4 h-4" />
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            {data.meanings.map((m, idx) => (
                                                <div key={idx} className="space-y-3">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <span className="px-2 py-0.5 bg-scarlet/10 text-scarlet rounded-full text-[10px] font-bold border border-scarlet/20 shrink-0">
                                                                {m.part_of_speech}
                                                            </span>
                                                            <p className="text-sm font-bold text-zinc-800 leading-snug truncate">
                                                                {m.short_definition || m.definition.split('。')[0]}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => toggleMeaning(idx)}
                                                            className="text-[10px] text-gold font-bold hover:text-scarlet transition-colors whitespace-nowrap px-2 py-1 rounded-md bg-zinc-100/50"
                                                        >
                                                            {expandedMeanings[idx] ? '閉じる' : '詳細'}
                                                        </button>
                                                    </div>

                                                    <AnimatePresence>
                                                        {expandedMeanings[idx] && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <p className="text-xs text-zinc-600 leading-relaxed pl-1 pt-1 mb-2 border-l border-gold/30 ml-1">
                                                                    {m.definition}
                                                                </p>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>

                                                    <div className="space-y-2 pl-3 border-l-2 border-zinc-200/50 ml-1">
                                                        {m.examples.map((ex, i) => (
                                                            <div key={i} className="group/item py-1">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-1.5 text-scarlet text-[9px] font-bold opacity-60">
                                                                        <ArrowRight className="w-2.5 h-2.5" /> {ex.scenario}
                                                                    </div>
                                                                    <button
                                                                        onClick={() => speak(ex.zh)}
                                                                        className="p-1 hover:bg-zinc-100 rounded-md transition-all text-zinc-300 hover:text-scarlet"
                                                                    >
                                                                        <Volume2 className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                                <p className="text-base font-bold text-zinc-800 leading-tight">{ex.zh}</p>
                                                                <p className="text-zinc-600 text-xs font-medium">{ex.jp}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Synonyms & Tips */}
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="premium-card p-4">
                                            <h3 className="text-gold text-[10px] font-bold uppercase tracking-wider mb-2">類義語</h3>
                                            <div className="space-y-2">
                                                {data.synonyms.map((syn, i) => (
                                                    <div key={i} className="flex justify-between items-center border-b border-zinc-200 pb-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-sm text-zinc-800">{syn.word}</span>
                                                            <span className="text-[10px] text-zinc-500 font-medium">{syn.pinyin}</span>
                                                            <button onClick={() => speak(syn.word)} className="text-zinc-400 hover:text-scarlet transition-colors">
                                                                <Volume2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                        <span className="text-[11px] text-zinc-700 font-medium">{syn.nuance}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="premium-card p-4">
                                            <h3 className="text-gold text-[10px] font-bold uppercase tracking-wider mb-2">使い分けのコツ</h3>
                                            <p className="text-xs leading-relaxed text-zinc-800 font-medium">{data.usage_tips}</p>
                                            <div className="mt-3 flex flex-wrap gap-1.5">
                                                {data.summary.map((tag, i) => (
                                                    <span key={i} className="text-[9px] bg-white/50 text-gold px-1.5 py-0.5 rounded border border-gold/20 font-bold">#{tag}</span>
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
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gold">
                            <Book className="w-6 h-6 text-scarlet" />
                            保存した単語 ({savedWords.length})
                        </h2>

                        <div className="space-y-1">
                            {/* Table Header */}
                            <div className="px-4 py-2 grid grid-cols-[80px_100px_1fr_80px] gap-2 text-[10px] font-bold text-gold uppercase tracking-wider border-b border-zinc-200">
                                <span>単語</span>
                                <span>ピンイン</span>
                                <span>意味</span>
                                <span className="text-right pr-2">操作</span>
                            </div>

                            {savedWords.length === 0 ? (
                                <div className="text-center py-20 bg-ivory/50 rounded-xl border border-dashed border-zinc-300">
                                    <p className="text-zinc-500 text-sm font-medium">保存された単語はありません。</p>
                                </div>
                            ) : (
                                savedWords.map((item) => (
                                    <div key={item.id} className="premium-card px-4 py-2 grid grid-cols-[80px_100px_1fr_80px] gap-2 items-center group hover:border-scarlet/30 transition-all">
                                        <span className="text-sm font-bold text-zinc-800 truncate">{item.word}</span>
                                        <span className="text-[10px] text-zinc-400 font-medium truncate">{item.data.pinyin}</span>
                                        <p className="text-zinc-500 text-[11px] font-medium truncate">
                                            {item.data.meanings?.[0]?.short_definition || (item.data.meanings?.[0]?.definition || item.data.definitions?.original || '').split('。')[0]}
                                        </p>
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => {
                                                    setData(item.data);
                                                    setView('search');
                                                    setExpandedMeanings({});
                                                }}
                                                className="p-1.5 text-zinc-400 hover:text-scarlet transition-colors"
                                            >
                                                <Search className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => deleteWord(item.id)}
                                                className="p-1.5 text-zinc-300 hover:text-scarlet transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )
                }
            </main >

            {/* Footer */}
            < footer className="mt-8 pb-4 text-center text-gold/60 text-[10px] space-y-1" >
                <p>&copy; 2026 Chinese AI Coach</p>
                <p className="opacity-70 font-bold">Version 1.0.11</p>
            </footer >
        </div >
    );
};

export default App;

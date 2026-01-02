import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Search, Plus, Book, Trash2, Loader2, Languages, ArrowRight, ChevronDown, CheckCircle2, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const App = () => {
    const [word, setWord] = useState('');
    const [data, setData] = useState(null);
    const [candidates, setCandidates] = useState(null);
    const [detailCache, setDetailCache] = useState({});
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [savedWords, setSavedWords] = useState([]);
    const [view, setView] = useState('search');
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

    const generateExplanation = async (targetWord = word, isManual = true) => {
        if (!targetWord) return;
        setLoading(true);
        setStatus('AIが解析中...');
        if (isManual) {
            setData(null);
            setCandidates(null);
            setDetailCache({});
        }

        // キャッシュチェック
        const saved = savedWords.find(s => s.word === targetWord);
        if (saved) {
            setData(saved.data);
            setLoading(false);
            setStatus('');
            return;
        }

        try {
            const response = await fetch('/.netlify/functions/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word: targetWord }),
            });
            const result = await response.json();
            if (result.error) throw new Error(result.error);

            if (result.type === 'candidates') {
                setCandidates(result.candidates);
                setStatus('');
            } else {
                setData(result);
                setDetailCache(prev => ({ ...prev, [result.word]: result }));
            }
        } catch (error) {
            console.error('Generation failed:', error);
            alert('解析に失敗しました。');
        } finally {
            setLoading(false);
            setStatus('');
        }
    };

    const selectCandidate = async (cand) => {
        setWord(cand.zh);
        if (detailCache[cand.zh]) {
            setData(detailCache[cand.zh]);
        } else {
            await generateExplanation(cand.zh, false);
        }

        // スマート・バックグラウンドロード: 他の候補も順次取得
        candidates.forEach((c, idx) => {
            if (c.zh !== cand.zh && !detailCache[c.zh]) {
                setTimeout(() => {
                    fetchDetailInBackground(c.zh);
                }, (idx + 1) * 2000); // 2秒おきに1つずつ
            }
        });
    };

    const fetchDetailInBackground = async (zh) => {
        if (detailCache[zh]) return;
        try {
            const response = await fetch('/.netlify/functions/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ word: zh }),
            });
            const result = await response.json();
            if (!result.error) {
                setDetailCache(prev => ({ ...prev, [zh]: result }));
            }
        } catch (e) {
            console.error('BG load failed:', zh, e);
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
            alert('保存しました！');
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
            <nav className="flex justify-between items-center mb-6">
                <h1 className="text-xl font-bold text-gold flex items-center gap-2">
                    <Languages className="w-6 h-6 text-scarlet" />
                    Chinese AI Coach
                </h1>
                <div className="flex bg-ivory p-1 rounded-xl shadow-sm border border-zinc-300/50">
                    <button onClick={() => setView('search')} className={`px-4 py-1.5 rounded-lg transition-all ${view === 'search' ? 'bg-scarlet text-white shadow-md' : 'text-gold hover:text-scarlet'}`}>
                        <Search className="w-4 h-4" />
                    </button>
                    <button onClick={() => setView('library')} className={`px-4 py-1.5 rounded-lg transition-all ${view === 'library' ? 'bg-scarlet text-white shadow-md' : 'text-gold hover:text-scarlet'}`}>
                        <Book className="w-4 h-4" />
                    </button>
                </div>
            </nav>

            <main>
                {view === 'search' ? (
                    <div className="space-y-4">
                        <div className="relative group">
                            <input
                                type="text"
                                value={word}
                                onChange={(e) => setWord(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && generateExplanation()}
                                placeholder="単語を検索..."
                                className="w-full glass-input text-lg pr-28 py-2"
                            />
                            <button onClick={() => generateExplanation()} disabled={loading} className="absolute right-1.5 top-1.5 btn-primary py-1.5 px-4 text-sm flex items-center gap-2">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : '検索'}
                            </button>
                        </div>

                        <AnimatePresence mode="wait">
                            {loading && !candidates && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center py-20 space-y-4">
                                    <div className="w-16 h-16 border-4 border-scarlet/10 border-t-scarlet rounded-full animate-spin" />
                                    <p className="text-scarlet font-medium animate-pulse">{status}</p>
                                </motion.div>
                            )}

                            {candidates && !data && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                    <div className="bg-white/50 border border-gold/20 p-4 rounded-2xl">
                                        <h3 className="text-zinc-800 font-bold mb-3 flex items-center justify-between">
                                            候補が複数あります
                                            <span className="text-[10px] text-zinc-400 font-normal">最適なものを選んでください</span>
                                        </h3>
                                        <div className="space-y-1">
                                            <div className="grid grid-cols-[100px_100px_1fr_60px_60px] gap-2 px-3 py-1.5 text-[9px] font-bold text-gold uppercase tracking-wider border-b border-zinc-100">
                                                <span>中国語</span><span>ピンイン</span><span>意味</span><span>用途</span><span>評価</span>
                                            </div>
                                            {candidates.map((cand, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => selectCandidate(cand)}
                                                    className="w-full grid grid-cols-[100px_100px_1fr_60px_60px] gap-2 items-center px-3 py-2.5 bg-white hover:bg-scarlet/5 rounded-xl border border-zinc-100 transition-all text-left"
                                                >
                                                    <span className="text-sm font-bold text-zinc-800">{cand.zh}</span>
                                                    <span className="text-[10px] text-zinc-400 font-medium truncate">{cand.pinyin}</span>
                                                    <span className="text-xs text-zinc-600 truncate">{cand.jp_meaning}</span>
                                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded w-fit ${cand.usage.includes('口') ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                                        {cand.usage}
                                                    </span>
                                                    <div className="flex gap-0.5 text-gold">
                                                        {[...Array(cand.recommendation)].map((_, j) => <span key={j}>★</span>)}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {data && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                                    {/* Candidate Tabs */}
                                    {candidates && (
                                        <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                                            {candidates.map((cand, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => {
                                                        const cachedDetail = detailCache[cand.zh];
                                                        if (cachedDetail) setData(cachedDetail);
                                                        else generateExplanation(cand.zh, false);
                                                    }}
                                                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${data.word === cand.zh ? 'bg-scarlet text-white border-scarlet shadow-md' : 'bg-white text-zinc-400 border-zinc-200 hover:border-scarlet/30'}`}
                                                >
                                                    {cand.zh}
                                                    {!detailCache[cand.zh] && data.word !== cand.zh && <span className="ml-1 opacity-50 animate-pulse">...</span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <div className="premium-card p-5 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4">
                                            <button onClick={saveWord} className="text-scarlet hover:text-scarlet/80 transition-colors flex items-center gap-1.5 text-xs font-semibold">
                                                <Plus className="w-4 h-4" /> 保存
                                            </button>
                                        </div>

                                        <div className="mb-4">
                                            <div className="flex items-baseline gap-2 mb-1">
                                                <h2 className="text-2xl font-bold text-zinc-800">{data.word}</h2>
                                                <span onClick={() => speak(data.word)} className="text-lg text-zinc-500 font-medium cursor-pointer hover:text-scarlet transition-all flex items-center gap-1">
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
                                                            <span className="px-2 py-0.5 bg-scarlet/10 text-scarlet rounded-full text-[10px] font-bold border border-scarlet/20 shrink-0">{m.part_of_speech}</span>
                                                            <p className="text-sm font-bold text-zinc-800 leading-snug truncate">{m.short_definition || m.definition.split('。')[0]}</p>
                                                        </div>
                                                        <button onClick={() => toggleMeaning(idx)} className="text-[10px] text-gold font-bold hover:text-scarlet transition-colors whitespace-nowrap px-2 py-1 rounded-md bg-zinc-100/50">
                                                            {expandedMeanings[idx] ? '閉じる' : '詳細'}
                                                        </button>
                                                    </div>
                                                    <AnimatePresence>
                                                        {expandedMeanings[idx] && (
                                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                                                <p className="text-xs text-zinc-600 leading-relaxed pl-1 pt-1 mb-2 border-l border-gold/30 ml-1">{m.definition}</p>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                    <div className="space-y-2 pl-3 border-l-2 border-zinc-200/50 ml-1">
                                                        {m.examples.map((ex, i) => (
                                                            <div key={i} className="group/item py-1">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-1.5 text-scarlet text-[9px] font-bold opacity-60"><ArrowRight className="w-2.5 h-2.5" /> {ex.scenario}</div>
                                                                    <button onClick={() => speak(ex.zh)} className="p-1 hover:bg-zinc-100 rounded-md transition-all text-zinc-300 hover:text-scarlet"><Volume2 className="w-3 h-3" /></button>
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

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="premium-card p-4">
                                            <h3 className="text-gold text-[10px] font-bold uppercase tracking-wider mb-2">類義語</h3>
                                            <div className="space-y-2">
                                                {data.synonyms.map((syn, i) => (
                                                    <div key={i} className="flex justify-between items-center border-b border-zinc-200 pb-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-sm text-zinc-800">{syn.word}</span>
                                                            <span className="text-[10px] text-zinc-500 font-medium">{syn.pinyin}</span>
                                                            <button onClick={() => speak(syn.word)} className="text-zinc-400 hover:text-scarlet transition-colors"><Volume2 className="w-3 h-3" /></button>
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
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gold">
                            <Book className="w-6 h-6 text-scarlet" />
                            保存した単語 ({savedWords.length})
                        </h2>
                        <div className="space-y-1">
                            <div className="px-4 py-2 grid grid-cols-[80px_100px_1fr_80px] gap-2 text-[10px] font-bold text-gold uppercase tracking-wider border-b border-zinc-200">
                                <span>単語</span><span>ピンイン</span><span>意味</span><span className="text-right pr-2">操作</span>
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
                                        <p className="text-zinc-500 text-[11px] font-medium truncate">{item.data.meanings?.[0]?.short_definition || (item.data.meanings?.[0]?.definition || '').split('。')[0]}</p>
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => { setData(item.data); setView('search'); setExpandedMeanings({}); }} className="p-1.5 text-zinc-400 hover:text-scarlet transition-colors"><Search className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => deleteWord(item.id)} className="p-1.5 text-zinc-300 hover:text-scarlet transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </main>

            <footer className="mt-8 pb-4 text-center text-gold/60 text-[10px] space-y-1">
                <p>&copy; 2026 Chinese AI Coach</p>
                <p className="opacity-70 font-bold">Version 1.0.15</p>
            </footer>
        </div>
    );
};

export default App;

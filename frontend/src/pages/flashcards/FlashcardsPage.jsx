import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { PageHeader } from '../../components/PageHeader';
import { 
  Brain, Sparkles, RotateCcw, ChevronRight, ChevronLeft, 
  Check, X, Shuffle, BookOpen, Trophy, Loader2, PartyPopper
} from 'lucide-react';
import { toast } from 'sonner';

// Confetti component
const Confetti = ({ isActive }) => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (isActive) {
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];
      const newParticles = [];
      
      for (let i = 0; i < 150; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100,
          delay: Math.random() * 3,
          duration: 3 + Math.random() * 2,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 8 + Math.random() * 12,
          rotation: Math.random() * 360,
        });
      }
      setParticles(newParticles);
    }
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute animate-confetti"
          style={{
            left: `${particle.x}%`,
            top: '-20px',
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            backgroundColor: particle.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            transform: `rotate(${particle.rotation}deg)`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
          }}
        />
      ))}
    </div>
  );
};

// Firework component
const Fireworks = ({ isActive }) => {
  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-firework"
          style={{
            left: `${15 + Math.random() * 70}%`,
            top: `${20 + Math.random() * 40}%`,
            animationDelay: `${i * 0.3}s`,
          }}
        >
          {[...Array(12)].map((_, j) => (
            <div
              key={j}
              className="absolute w-2 h-2 rounded-full animate-spark"
              style={{
                backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFEAA7', '#DDA0DD'][j % 5],
                transform: `rotate(${j * 30}deg) translateY(-30px)`,
                animationDelay: `${i * 0.3 + 0.1}s`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const FlashcardsPage = () => {
  const [text, setText] = useState('');
  const [numCards, setNumCards] = useState(5);
  const [flashcards, setFlashcards] = useState([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState(new Set());
  const [studyMode, setStudyMode] = useState('all');
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationStep, setCelebrationStep] = useState(0);

  const generateMutation = useMutation({
    mutationFn: (data) => api.generateFlashcards(data.text, data.numCards),
    onSuccess: (data) => {
      if (data.flashcards && data.flashcards.length > 0) {
        setFlashcards(data.flashcards);
        setCurrentCard(0);
        setFlipped(false);
        setKnownCards(new Set());
        setShowCelebration(false);
        setCelebrationStep(0);
        toast.success(`Создано ${data.flashcards.length} флешкарт!`);
      } else {
        toast.error('Не удалось создать флешкарты. Попробуйте другой текст.');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Ошибка при создании флешкарт');
    },
  });

  const handleGenerate = () => {
    if (!text.trim()) {
      toast.error('Введите текст для создания флешкарт');
      return;
    }
    if (text.length < 50) {
      toast.error('Текст слишком короткий. Минимум 50 символов.');
      return;
    }
    generateMutation.mutate({ text, numCards });
  };

  const getFilteredCards = () => {
    if (studyMode === 'unknown') {
      return flashcards.filter((_, i) => !knownCards.has(i));
    }
    return flashcards;
  };

  const filteredCards = getFilteredCards();

  const markAsKnown = () => {
    const realIndex = studyMode === 'unknown'
      ? flashcards.indexOf(filteredCards[currentCard])
      : currentCard;
    
    setKnownCards(prev => new Set([...prev, realIndex]));
    
    if (currentCard < filteredCards.length - 1) {
      setCurrentCard(currentCard + 1);
    }
    setFlipped(false);
  };

  const shuffleCards = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setCurrentCard(0);
    setFlipped(false);
    setKnownCards(new Set());
    toast.success('Карточки перемешаны!');
  };

  const resetProgress = () => {
    setKnownCards(new Set());
    setCurrentCard(0);
    setFlipped(false);
    setStudyMode('all');
    setShowCelebration(false);
    setCelebrationStep(0);
    toast.success('Прогресс сброшен');
  };

  const handleFinish = () => {
    setShowCelebration(true);
    setCelebrationStep(1);
    
    // Step through celebration animation
    setTimeout(() => setCelebrationStep(2), 500);
    setTimeout(() => setCelebrationStep(3), 1500);
  };

  const handleNewMaterial = () => {
    setFlashcards([]);
    setText('');
    setKnownCards(new Set());
    setShowCelebration(false);
    setCelebrationStep(0);
  };

  const progress = flashcards.length > 0 
    ? Math.round((knownCards.size / flashcards.length) * 100) 
    : 0;

  const allCardsLearned = knownCards.size === flashcards.length && flashcards.length > 0;

  // Celebration screen
  if (showCelebration) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <PageHeader 
          title="AI Генератор Флешкарт" 
          subtitle="Создавай карточки для запоминания из своих заметок"
          icon={Brain}
          iconColor="#4F46E5"
        />

        <Confetti isActive={celebrationStep >= 1} />
        <Fireworks isActive={celebrationStep >= 2} />

        <div className="max-w-4xl mx-auto px-6 py-8">
          <Card className={`border-4 border-yellow-400 bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 shadow-2xl transform transition-all duration-700 ${celebrationStep >= 1 ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
            <CardContent className="p-12 text-center">
              <div className={`transform transition-all duration-500 delay-300 ${celebrationStep >= 2 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
                <div className="relative inline-block">
                  <Trophy className="w-24 h-24 text-yellow-500 mx-auto animate-bounce" />
                  <div className="absolute -top-2 -right-2">
                    <PartyPopper className="w-10 h-10 text-pink-500 animate-pulse" />
                  </div>
                  <div className="absolute -top-2 -left-2">
                    <Sparkles className="w-10 h-10 text-purple-500 animate-pulse" />
                  </div>
                </div>
              </div>
              
              <h2 className={`text-4xl font-bold bg-gradient-to-r from-yellow-600 via-orange-500 to-pink-500 bg-clip-text text-transparent mt-6 mb-4 transform transition-all duration-500 delay-500 ${celebrationStep >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                🎉 Поздравляем! 🎉
              </h2>
              
              <p className={`text-xl text-gray-700 mb-2 transform transition-all duration-500 delay-700 ${celebrationStep >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                Вы успешно изучили все карточки!
              </p>
              
              <div className={`bg-white/80 rounded-2xl p-6 mt-6 mb-8 transform transition-all duration-500 delay-900 ${celebrationStep >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-indigo-600">{flashcards.length}</div>
                    <div className="text-sm text-gray-500">Карточек изучено</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-green-600">100%</div>
                    <div className="text-sm text-gray-500">Выполнено</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-purple-600">⭐</div>
                    <div className="text-sm text-gray-500">Отличная работа!</div>
                  </div>
                </div>
              </div>

              <div className={`flex gap-4 justify-center transform transition-all duration-500 delay-1000 ${celebrationStep >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                <Button
                  onClick={resetProgress}
                  variant="outline"
                  className="border-2 border-indigo-300 text-indigo-600 hover:bg-indigo-50 h-12 px-6"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Повторить снова
                </Button>
                <Button
                  onClick={handleNewMaterial}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 h-12 px-6"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Новый материал
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <style>{`
          @keyframes confetti {
            0% {
              transform: translateY(0) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(100vh) rotate(720deg);
              opacity: 0;
            }
          }
          .animate-confetti {
            animation: confetti linear forwards;
          }
          @keyframes firework {
            0% {
              transform: scale(0);
              opacity: 1;
            }
            50% {
              transform: scale(1);
              opacity: 1;
            }
            100% {
              transform: scale(1.5);
              opacity: 0;
            }
          }
          .animate-firework {
            animation: firework 1s ease-out forwards;
          }
          @keyframes spark {
            0% {
              transform: rotate(var(--rotation)) translateY(0);
              opacity: 1;
            }
            100% {
              transform: rotate(var(--rotation)) translateY(-60px);
              opacity: 0;
            }
          }
          .animate-spark {
            animation: spark 0.8s ease-out forwards;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <PageHeader 
        title="AI Генератор Флешкарт" 
        subtitle="Создавай карточки для запоминания из своих заметок"
        icon={Brain}
        iconColor="#4F46E5"
      />

      <div className="max-w-4xl mx-auto px-6 py-8">
        {flashcards.length === 0 ? (
          <Card className="border-2 border-gray-200 bg-white shadow-xl">
            <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-purple-50">
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                Создать флешкарты
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Учебный материал
                </label>
                <Textarea
                  placeholder="Вставьте сюда текст из учебника, конспекта лекций или любой учебный материал...

Например:
Фотосинтез — это процесс, при котором растения преобразуют световую энергию в химическую. Происходит в хлоропластах, содержащих хлорофилл. В результате из углекислого газа и воды образуется глюкоза и кислород."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="min-h-[200px] border-2 border-gray-200 focus:border-indigo-500 resize-none text-base"
                />
                <div className="flex justify-between mt-2 text-sm text-gray-500">
                  <span>{text.length} символов</span>
                  <span className={text.length < 50 ? 'text-red-500' : 'text-green-600'}>
                    {text.length < 50 ? `Ещё ${50 - text.length} символов` : '✓ Достаточно текста'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Количество карточек
                </label>
                <div className="flex gap-2">
                  {[3, 5, 7, 10].map((n) => (
                    <Button
                      key={n}
                      variant={numCards === n ? 'default' : 'outline'}
                      onClick={() => setNumCards(n)}
                      className={`flex-1 ${numCards === n ? 'bg-indigo-600' : 'border-2 border-gray-200'}`}
                    >
                      {n}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={text.length < 50 || generateMutation.isPending}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 h-14 text-lg font-semibold shadow-lg"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    AI создаёт карточки...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Создать {numCards} флешкарт
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Progress and Stats */}
            <Card className="border-2 border-gray-200 bg-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                      <span className="font-semibold text-gray-900">
                        Изучено: {knownCards.size}/{flashcards.length}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {progress}% выполнено
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant={studyMode === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => { setStudyMode('all'); setCurrentCard(0); setFlipped(false); }}
                      className={studyMode === 'all' ? 'bg-indigo-600' : ''}
                    >
                      Все
                    </Button>
                    <Button
                      variant={studyMode === 'unknown' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => { setStudyMode('unknown'); setCurrentCard(0); setFlipped(false); }}
                      className={studyMode === 'unknown' ? 'bg-indigo-600' : ''}
                      disabled={knownCards.size === flashcards.length}
                    >
                      Неизученные ({flashcards.length - knownCards.size})
                    </Button>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${
                      allCardsLearned 
                        ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                        : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Show finish button when all cards learned */}
            {allCardsLearned && (
              <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 animate-pulse-slow">
                <CardContent className="p-6 text-center">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <Trophy className="w-8 h-8 text-yellow-500" />
                    <span className="text-xl font-bold text-green-700">
                      Все карточки изучены! 🎉
                    </span>
                    <Trophy className="w-8 h-8 text-yellow-500" />
                  </div>
                  <Button
                    onClick={handleFinish}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 h-14 px-12 text-lg font-bold shadow-lg transform hover:scale-105 transition-transform"
                  >
                    <PartyPopper className="w-6 h-6 mr-2" />
                    Завершить обучение
                    <Sparkles className="w-6 h-6 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Flashcard */}
            {filteredCards.length > 0 && (
              <>
                <div 
                  className="perspective-1000 cursor-pointer"
                  onClick={() => setFlipped(!flipped)}
                >
                  <div 
                    className={`relative transition-transform duration-500 transform-style-preserve-3d ${
                      flipped ? 'rotate-y-180' : ''
                    }`}
                    style={{
                      transformStyle: 'preserve-3d',
                      transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                    }}
                  >
                    {/* Front of card */}
                    <Card 
                      className={`border-2 shadow-xl ${
                        flipped ? 'invisible' : ''
                      } ${
                        knownCards.has(studyMode === 'unknown' 
                          ? flashcards.indexOf(filteredCards[currentCard]) 
                          : currentCard)
                          ? 'border-green-300 bg-green-50'
                          : 'border-indigo-300 bg-white'
                      }`}
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      <CardContent className="p-8 min-h-[300px] flex flex-col items-center justify-center">
                        <div className="text-sm text-gray-500 mb-4">
                          Карточка {currentCard + 1} из {filteredCards.length}
                        </div>
                        <div className="text-sm font-semibold text-indigo-600 mb-4 uppercase tracking-wider">
                          Вопрос
                        </div>
                        <div className="text-xl text-gray-900 text-center px-4 leading-relaxed">
                          {filteredCards[currentCard]?.question}
                        </div>
                        <div className="mt-8 text-sm text-gray-400 flex items-center gap-2">
                          <RotateCcw className="w-4 h-4" />
                          Нажмите чтобы перевернуть
                        </div>
                      </CardContent>
                    </Card>

                    {/* Back of card */}
                    <Card 
                      className={`border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-xl absolute inset-0 ${
                        !flipped ? 'invisible' : ''
                      }`}
                      style={{ 
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                      }}
                    >
                      <CardContent className="p-8 min-h-[300px] flex flex-col items-center justify-center">
                        <div className="text-sm text-gray-500 mb-4">
                          Карточка {currentCard + 1} из {filteredCards.length}
                        </div>
                        <div className="text-sm font-semibold text-purple-600 mb-4 uppercase tracking-wider">
                          Ответ
                        </div>
                        <div className="text-xl text-gray-900 text-center px-4 leading-relaxed">
                          {filteredCards[currentCard]?.answer}
                        </div>
                        <div className="mt-8 text-sm text-gray-400 flex items-center gap-2">
                          <RotateCcw className="w-4 h-4" />
                          Нажмите чтобы перевернуть
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => { 
                      setCurrentCard(Math.max(0, currentCard - 1)); 
                      setFlipped(false); 
                    }}
                    disabled={currentCard === 0}
                    variant="outline"
                    className="flex-1 border-2 border-gray-200 h-12"
                  >
                    <ChevronLeft className="w-5 h-5 mr-1" />
                    Назад
                  </Button>
                  
                  <Button
                    onClick={markAsKnown}
                    variant="outline"
                    className="border-2 border-green-300 text-green-600 hover:bg-green-50 h-12 px-6"
                  >
                    <Check className="w-5 h-5 mr-1" />
                    Знаю
                  </Button>

                  <Button
                    onClick={() => { 
                      setCurrentCard(Math.min(filteredCards.length - 1, currentCard + 1)); 
                      setFlipped(false); 
                    }}
                    disabled={currentCard === filteredCards.length - 1}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-12"
                  >
                    Далее
                    <ChevronRight className="w-5 h-5 ml-1" />
                  </Button>
                </div>

                {/* Control buttons */}
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={shuffleCards}
                    variant="outline"
                    className="border-2 border-gray-200"
                  >
                    <Shuffle className="w-4 h-4 mr-2" />
                    Перемешать
                  </Button>
                  <Button
                    onClick={resetProgress}
                    variant="outline"
                    className="border-2 border-gray-200"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Сбросить прогресс
                  </Button>
                  <Button
                    onClick={handleNewMaterial}
                    variant="outline"
                    className="border-2 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Новый материал
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* CSS for flip animation */}
      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-preserve-3d {
          transform-style: preserve-3d;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

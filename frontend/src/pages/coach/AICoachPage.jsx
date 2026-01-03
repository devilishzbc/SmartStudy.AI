import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { PageHeader } from '../../components/PageHeader';
import { Sparkles, Send, MessageSquare, User, Bot, AlertCircle, Loader2, Edit2, Trash2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

// Typing effect component
const TypingMessage = ({ content, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  
  useEffect(() => {
    if (isComplete) return;
    
    let index = 0;
    const speed = 15; // ms per character
    
    const timer = setInterval(() => {
      if (index < content.length) {
        setDisplayedText(content.slice(0, index + 1));
        index++;
      } else {
        clearInterval(timer);
        setIsComplete(true);
        onComplete?.();
      }
    }, speed);
    
    return () => clearInterval(timer);
  }, [content, isComplete, onComplete]);
  
  return (
    <span>
      {displayedText}
      {!isComplete && <span className="animate-pulse">▌</span>}
    </span>
  );
};

// Thinking indicator component
const ThinkingIndicator = () => (
  <div className="flex gap-3 justify-start">
    <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0">
      <Bot className="w-5 h-5 text-white" />
    </div>
    <div className="bg-gray-100 text-gray-900 border-2 border-gray-200 p-4 rounded-2xl">
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-violet-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
          <span className="w-2 h-2 bg-violet-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
          <span className="w-2 h-2 bg-violet-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
        </div>
        <span className="text-sm text-gray-500 ml-2">AI думает...</span>
      </div>
    </div>
  </div>
);

export const AICoachPage = () => {
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [typingMessageId, setTypingMessageId] = useState(null);
  const [localMessages, setLocalMessages] = useState([]);
  const [editingConversationId, setEditingConversationId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const messagesEndRef = useRef(null);

  const { data: conversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api.getConversations(),
  });

  const { data: rateLimit, refetch: refetchRateLimit } = useQuery({
    queryKey: ['coachRateLimit'],
    queryFn: () => api.getCoachRateLimit(),
    refetchInterval: 60000,
  });

  const { data: messages, refetch: refetchMessages } = useQuery({
    queryKey: ['messages', selectedConversation],
    queryFn: () => selectedConversation ? api.getMessages(selectedConversation) : Promise.resolve([]),
    enabled: !!selectedConversation,
  });

  // Sync local messages with fetched messages
  useEffect(() => {
    if (messages) {
      setLocalMessages(messages);
    }
  }, [messages]);

  const createConversationMutation = useMutation({
    mutationFn: () => api.createConversation({ title: 'New Conversation' }),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['conversations']);
      setSelectedConversation(data.id);
      setLocalMessages([]);
      toast.success('Новый диалог создан!');
    },
  });

  const updateConversationMutation = useMutation({
    mutationFn: ({ conversationId, title }) => api.updateConversation(conversationId, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries(['conversations']);
      setEditingConversationId(null);
      setEditTitle('');
      toast.success('Название обновлено!');
    },
    onError: () => {
      toast.error('Ошибка обновления');
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: (conversationId) => api.deleteConversation(conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries(['conversations']);
      if (selectedConversation === editingConversationId) {
        setSelectedConversation(null);
        setLocalMessages([]);
      }
      toast.success('Диалог удалён!');
    },
    onError: () => {
      toast.error('Ошибка удаления');
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ conversationId, content }) => api.sendMessage(conversationId, content),
    onSuccess: (response) => {
      refetchRateLimit();
      // Add AI response with typing effect
      setLocalMessages(prev => [...prev, response]);
      setTypingMessageId(response.id);
      setIsThinking(false);
    },
    onError: (error) => {
      setIsThinking(false);
      if (error.response?.status === 429) {
        toast.error('Превышен дневной лимит сообщений. Попробуй завтра!');
      } else {
        toast.error('Ошибка отправки сообщения');
      }
    },
  });

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;
    
    if (rateLimit && !rateLimit.is_allowed) {
      toast.error('Превышен дневной лимит сообщений. Попробуй завтра!');
      return;
    }

    const userMessage = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: messageInput,
      created_at: new Date().toISOString(),
    };

    // Immediately show user message
    setLocalMessages(prev => [...prev, userMessage]);
    setMessageInput('');
    setIsSending(true);
    setIsThinking(true);

    try {
      await sendMessageMutation.mutateAsync({
        conversationId: selectedConversation,
        content: userMessage.content,
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleStartNewConversation = () => {
    createConversationMutation.mutate();
  };

  const handleTypingComplete = () => {
    setTypingMessageId(null);
    // Refetch to sync with server
    refetchMessages();
  };

  useEffect(() => {
    if (conversations && conversations.length > 0 && !selectedConversation) {
      setSelectedConversation(conversations[0].id);
    }
  }, [conversations, selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages, isThinking]);

  const suggestedQuestions = [
    'Как улучшить моё расписание учёбы?',
    'На чём сосредоточиться на этой неделе?',
    'Помоги разбить сложные задачи',
    'Как мне лучше подготовиться к экзамену?',
  ];

  const isLimitReached = rateLimit && !rateLimit.is_allowed;

  return (
    <div className="min-h-screen">
      <PageHeader 
        title="AI Study Coach" 
        subtitle="Твой персональный помощник по учёбе"
        icon={Sparkles}
        iconColor="#8B5CF6"
      />
      
      {/* Action Bar */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Rate Limit Indicator */}
          <div className="flex items-center gap-4">
            {rateLimit && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${
                isLimitReached 
                  ? 'bg-red-100 text-red-700' 
                  : 'bg-violet-100 text-violet-700'
              }`}>
                {isLimitReached ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span className="text-sm font-semibold">
                  {isLimitReached 
                    ? 'Лимит исчерпан'
                    : `${rateLimit.messages_remaining}/${rateLimit.daily_limit} сообщений`
                  }
                </span>
              </div>
            )}
            {isLimitReached && (
              <span className="text-sm text-gray-500">
                Обновится в полночь UTC
              </span>
            )}
          </div>
          
          <Button
            onClick={handleStartNewConversation}
            className="bg-violet-600 hover:bg-violet-700 text-white h-12 px-6 rounded-xl"
            disabled={createConversationMutation.isPending}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Новый диалог
          </Button>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Conversations List */}
          <div className="lg:col-span-1">
            <Card className="border-2 border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="font-heading text-lg text-gray-900">Диалоги</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {conversations && conversations.length === 0 ? (
                    <div className="text-sm text-gray-500 text-center py-4">
                      Пока нет диалогов
                    </div>
                  ) : (
                    conversations?.map((conv) => (
                      <div
                        key={conv.id}
                        className={`p-3 rounded-lg transition-colors group ${
                          selectedConversation === conv.id
                            ? 'bg-violet-100 border-2 border-violet-600'
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                        }`}
                      >
                        {editingConversationId === conv.id ? (
                          // Режим редактирования
                          <div className="flex items-center gap-2">
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="h-8 text-sm"
                              autoFocus
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  updateConversationMutation.mutate({ conversationId: conv.id, title: editTitle });
                                }
                              }}
                            />
                            <button
                              onClick={() => updateConversationMutation.mutate({ conversationId: conv.id, title: editTitle })}
                              className="p-1 text-green-600 hover:bg-green-100 rounded"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setEditingConversationId(null); setEditTitle(''); }}
                              className="p-1 text-gray-500 hover:bg-gray-200 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          // Обычный режим
                          <div
                            onClick={() => {
                              setSelectedConversation(conv.id);
                              setTypingMessageId(null);
                            }}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-semibold text-sm text-gray-900 truncate flex-1">
                                {conv.title}
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingConversationId(conv.id);
                                    setEditTitle(conv.title);
                                  }}
                                  className="p-1 text-gray-500 hover:text-violet-600 hover:bg-violet-100 rounded"
                                  title="Редактировать"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm('Удалить этот диалог?')) {
                                      deleteConversationMutation.mutate(conv.id);
                                    }
                                  }}
                                  className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-100 rounded"
                                  title="Удалить"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {new Date(conv.created_at).toLocaleDateString('ru-RU')}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3">
            <Card className="border-2 border-gray-200 bg-white h-[calc(100vh-250px)] flex flex-col">
              {!selectedConversation ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Bot className="w-16 h-16 mx-auto mb-4 text-violet-600" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Добро пожаловать в AI Study Coach!</h3>
                    <p className="text-gray-600 mb-6">Начни диалог для персональных рекомендаций по учёбе</p>
                    <Button onClick={handleStartNewConversation} className="bg-violet-600 hover:bg-violet-700">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Начать диалог
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Messages */}
                  <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
                    {localMessages && localMessages.length === 0 && !isThinking ? (
                      <div className="text-center py-8">
                        <Bot className="w-12 h-12 mx-auto mb-4 text-violet-600" />
                        <h4 className="text-lg font-semibold text-gray-900 mb-2">Чем могу помочь?</h4>
                        <p className="text-gray-600 mb-4">Попробуй спросить:</p>
                        <div className="grid grid-cols-2 gap-2 max-w-2xl mx-auto">
                          {suggestedQuestions.map((question, idx) => (
                            <button
                              key={idx}
                              onClick={() => setMessageInput(question)}
                              className="p-3 text-sm text-left bg-violet-50 hover:bg-violet-100 rounded-lg border-2 border-violet-200 text-gray-900 transition-colors"
                            >
                              {question}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        {localMessages?.map((msg, idx) => (
                          <div
                            key={msg.id || idx}
                            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            {msg.role === 'assistant' && (
                              <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0">
                                <Bot className="w-5 h-5 text-white" />
                              </div>
                            )}
                            <div
                              className={`max-w-[70%] p-4 rounded-2xl ${
                                msg.role === 'user'
                                  ? 'bg-violet-600 text-white'
                                  : 'bg-gray-100 text-gray-900 border-2 border-gray-200'
                              }`}
                            >
                              <div className="text-sm whitespace-pre-wrap">
                                {msg.role === 'assistant' && typingMessageId === msg.id ? (
                                  <TypingMessage 
                                    content={msg.content} 
                                    onComplete={handleTypingComplete}
                                  />
                                ) : (
                                  msg.content
                                )}
                              </div>
                              <div className="text-xs mt-2 opacity-70">
                                {new Date(msg.created_at).toLocaleTimeString('ru-RU')}
                              </div>
                            </div>
                            {msg.role === 'user' && (
                              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                                <User className="w-5 h-5 text-white" />
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {/* Thinking indicator */}
                        {isThinking && <ThinkingIndicator />}
                      </>
                    )}
                    <div ref={messagesEndRef} />
                  </CardContent>

                  {/* Input */}
                  <div className="border-t-2 border-gray-200 p-4">
                    {isLimitReached ? (
                      <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 text-center">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                        <p className="font-semibold text-red-700">Дневной лимит сообщений исчерпан</p>
                        <p className="text-sm text-red-600 mt-1">Лимит обновится в полночь UTC</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <Input
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                            placeholder="Спроси своего AI-помощника по учёбе..."
                            className="flex-1 h-12"
                            disabled={isSending || isThinking}
                          />
                          <Button
                            onClick={handleSendMessage}
                            disabled={!messageInput.trim() || isSending || isThinking}
                            className="bg-violet-600 hover:bg-violet-700 h-12 px-6"
                          >
                            {isSending || isThinking ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          Enter — отправить • Shift+Enter — новая строка
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

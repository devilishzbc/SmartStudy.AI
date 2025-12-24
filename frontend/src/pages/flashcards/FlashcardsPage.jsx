import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { PageHeader } from '../../components/PageHeader';
import { Brain, Sparkles, RotateCcw, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export const FlashcardsPage = () => {
  const [text, setText] = useState('');
  const [flashcards, setFlashcards] = useState([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const generateMutation = useMutation({
    mutationFn: (text) => api.generateFlashcards(text),
    onSuccess: (data) => {
      if (data.flashcards && data.flashcards.length > 0) {
        setFlashcards(data.flashcards);
        setCurrentCard(0);
        setFlipped(false);
        toast.success('Flashcards generated successfully!');
      } else {
        toast.error('No flashcards generated. Try different text.');
      }
    },
    onError: () => {
      toast.error('Failed to generate flashcards');
    },
  });

  const handleGenerate = () => {
    if (!text.trim()) {
      toast.error('Please enter some text');
      return;
    }
    generateMutation.mutate(text);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      <PageHeader 
        title="AI Flashcards Generator" 
        subtitle="Generate study cards from your notes with AI"
        icon={Brain}
        iconColor="#4F46E5"
      />

      <div className="max-w-4xl mx-auto px-6 py-8">
        {flashcards.length === 0 ? (
          <Card className="border-2 border-gray-200 bg-white">
            <CardHeader>
              <CardTitle className="text-gray-900">Create Flashcards</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Paste your study notes here... (e.g., lecture notes, textbook chapters, etc.)"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[200px] border-2 border-gray-300"
              />
              <Button
                onClick={handleGenerate}
                disabled={!text || generateMutation.isPending}
                className="w-full bg-indigo-600 hover:bg-indigo-700 h-12"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {generateMutation.isPending ? 'Generating...' : 'Generate Flashcards with AI'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-2 border-indigo-300 bg-white mb-4 shadow-lg">
              <CardContent className="p-8">
                <div 
                  className="min-h-[300px] flex items-center justify-center cursor-pointer"
                  onClick={() => setFlipped(!flipped)}
                >
                  <div className="text-center">
                    <div className="text-sm text-gray-500 mb-4">
                      Card {currentCard + 1} of {flashcards.length}
                    </div>
                    <div className="text-2xl font-bold text-indigo-600 mb-4">
                      {flipped ? 'Answer:' : 'Question:'}
                    </div>
                    <div className="text-xl text-gray-900 px-8">
                      {flipped ? flashcards[currentCard].answer : flashcards[currentCard].question}
                    </div>
                    <div className="text-sm text-gray-400 mt-6">Click card to flip</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                onClick={() => { setCurrentCard(Math.max(0, currentCard - 1)); setFlipped(false); }}
                disabled={currentCard === 0}
                variant="outline"
                className="flex-1 border-2 border-gray-300"
              >
                Previous
              </Button>
              <Button
                onClick={() => { setFlashcards([]); setText(''); }}
                variant="outline"
                className="border-2 border-gray-300"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => { setCurrentCard(Math.min(flashcards.length - 1, currentCard + 1)); setFlipped(false); }}
                disabled={currentCard === flashcards.length - 1}
                className="flex-1 bg-indigo-600"
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

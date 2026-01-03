import { useState } from 'react';
import { useThemeStore } from '../../store/themeStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { PageHeader } from '../../components/PageHeader';
import { Palette, Check, Save } from 'lucide-react';
import { toast } from 'sonner';

export const ThemesPage = () => {
  const { currentTheme, setTheme, applyTheme, themes } = useThemeStore();
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);

  const handleSelectTheme = (key) => {
    setSelectedTheme(key);
  };

  const handleApplyTheme = () => {
    applyTheme(selectedTheme);
    toast.success(`Тема "${themes[selectedTheme].name}" успешно применена!`);
  };

  const hasChanges = selectedTheme !== currentTheme;

  return (
    <div className="min-h-screen">
      <PageHeader 
        title="Customize Your Theme" 
        subtitle="Choose a color scheme that inspires you"
        icon={Palette}
        iconColor={themes[selectedTheme].colors.primary}
      />
      
      {/* Action Bar */}
      {hasChanges && (
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-end">
            <Button
              onClick={handleApplyTheme}
              className="h-12 px-6 text-white"
              style={{ backgroundColor: themes[selectedTheme].colors.primary }}
            >
              <Save className="w-5 h-5 mr-2" />
              Apply Theme
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Card className="border-2 border-gray-200 bg-white">
          <CardHeader>
            <CardTitle className="text-2xl text-gray-900">Available Themes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(themes).map(([key, theme]) => (
                <div
                  key={key}
                  onClick={() => handleSelectTheme(key)}
                  className={`relative cursor-pointer rounded-2xl overflow-hidden border-4 transition-all duration-300 hover:scale-105 ${
                    selectedTheme === key 
                      ? 'border-gray-900 shadow-2xl ring-4 ring-offset-2' 
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                  style={{ 
                    ringColor: selectedTheme === key ? theme.colors.primary : undefined 
                  }}
                >
                  {/* Theme Preview */}
                  <div 
                    className="h-48 p-6"
                    style={{ 
                      background: `linear-gradient(to bottom right, ${theme.colors.gradientFrom}, ${theme.colors.gradientTo})` 
                    }}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="w-full h-4 rounded" style={{ backgroundColor: theme.colors.primary }} />
                      <div className="w-3/4 h-4 rounded" style={{ backgroundColor: theme.colors.secondary }} />
                      <div className="w-1/2 h-4 rounded" style={{ backgroundColor: theme.colors.accent }} />
                    </div>
                  </div>

                  {/* Theme Info */}
                  <div className="p-4 bg-white">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">{theme.name}</h3>
                      {currentTheme === key && (
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                      {selectedTheme === key && currentTheme !== key && (
                        <div className="px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-700">
                          Selected
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <div className="w-8 h-8 rounded-full border-2 border-gray-200" style={{ backgroundColor: theme.colors.primary }} />
                      <div className="w-8 h-8 rounded-full border-2 border-gray-200" style={{ backgroundColor: theme.colors.secondary }} />
                      <div className="w-8 h-8 rounded-full border-2 border-gray-200" style={{ backgroundColor: theme.colors.accent }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Current Theme Preview */}
        <Card className="border-2 border-gray-200 bg-white mt-6">
          <CardHeader>
            <CardTitle className="text-2xl text-gray-900 flex items-center justify-between">
              <span>Preview: {themes[selectedTheme].name}</span>
              {hasChanges && (
                <span className="text-sm font-normal text-orange-600 bg-orange-100 px-3 py-1 rounded-full">
                  Unsaved changes
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className="p-8 rounded-xl"
              style={{ 
                background: `linear-gradient(to bottom right, ${themes[selectedTheme].colors.gradientFrom}, ${themes[selectedTheme].colors.gradientTo})` 
              }}
            >
              <div className="space-y-4">
                <Button
                  className="w-full h-12 text-white font-semibold"
                  style={{
                    backgroundColor: themes[selectedTheme].colors.primary,
                  }}
                >
                  Primary Button
                </Button>
                <Button
                  className="w-full h-12 font-semibold"
                  variant="outline"
                  style={{
                    borderColor: themes[selectedTheme].colors.primary,
                    color: themes[selectedTheme].colors.primary,
                    borderWidth: '2px',
                  }}
                >
                  Outline Button
                </Button>
                <div className="p-4 rounded-lg bg-white border-2 border-gray-200">
                  <h3 className="font-semibold text-gray-900">Sample Card</h3>
                  <p className="text-gray-600 mt-2">This is how your content will look with the selected theme.</p>
                </div>
              </div>
            </div>
            
            {hasChanges && (
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={handleApplyTheme}
                  className="h-12 px-8 text-white font-semibold"
                  style={{ backgroundColor: themes[selectedTheme].colors.primary }}
                >
                  <Save className="w-5 h-5 mr-2" />
                  Apply "{themes[selectedTheme].name}" Theme
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

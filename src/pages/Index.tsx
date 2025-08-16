import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';

const Index = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [playerPosition, setPlayerPosition] = useState({ x: 0, y: 0, z: 0 });
  const [onlineCount, setOnlineCount] = useState(127);
  const [roomCode, setRoomCode] = useState('CRAFT-2024');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Simple 3D block rendering
  useEffect(() => {
    if (!canvasRef.current || !gameStarted) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#87CEEB'; // Sky blue
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw simple 3D blocks
    const drawBlock = (x: number, y: number, z: number, color: string) => {
      const size = 40;
      const offsetX = x * size + 200;
      const offsetY = y * size + 300;
      
      // Top face
      ctx.fillStyle = color;
      ctx.fillRect(offsetX, offsetY - z * 10, size, size);
      
      // Front face
      ctx.fillStyle = darkenColor(color, 20);
      ctx.fillRect(offsetX, offsetY - z * 10, size, size);
      
      // Side face
      ctx.fillStyle = darkenColor(color, 40);
      ctx.fillRect(offsetX + size, offsetY - z * 10, size * 0.5, size);
    };

    // Draw world
    for (let x = 0; x < 8; x++) {
      for (let z = 0; z < 8; z++) {
        // Grass blocks
        drawBlock(x, 0, z, '#228B22');
        // Some dirt blocks
        if (Math.random() > 0.7) {
          drawBlock(x, 1, z, '#8B4513');
        }
      }
    }

    // Draw player
    ctx.fillStyle = '#0066CC';
    ctx.fillRect(200 + playerPosition.x, 280 + playerPosition.y, 20, 40);
    
  }, [gameStarted, playerPosition]);

  const darkenColor = (color: string, percent: number) => {
    const f = parseInt(color.slice(1), 16);
    const t = percent < 0 ? 0 : 255;
    const p = percent < 0 ? percent * -1 : percent;
    const R = f >> 16;
    const G = f >> 8 & 0x00FF;
    const B = f & 0x0000FF;
    return "#" + (0x1000000 + (Math.round((t - R) * p / 100) + R) * 0x10000 + 
      (Math.round((t - G) * p / 100) + G) * 0x100 + 
      (Math.round((t - B) * p / 100) + B)).toString(16).slice(1);
  };

  const movePlayer = (direction: string) => {
    const speed = 20;
    setPlayerPosition(prev => {
      switch(direction) {
        case 'up': return { ...prev, y: prev.y - speed };
        case 'down': return { ...prev, y: prev.y + speed };
        case 'left': return { ...prev, x: prev.x - speed };
        case 'right': return { ...prev, x: prev.x + speed };
        default: return prev;
      }
    });
  };

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(180deg, #87CEEB 0%, #228B22 100%)',
      fontFamily: 'Orbitron, monospace'
    }}>
      {/* Header */}
      <div className="p-4 bg-black/20 backdrop-blur-sm border-b-4" style={{borderColor: '#8B4513'}}>
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white" style={{
            textShadow: '3px 3px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000',
            fontFamily: 'Orbitron, monospace'
          }}>
            BLOCKCRAFT 3D
          </h1>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="bg-green-600 text-white px-4 py-2 text-lg">
              <Icon name="Users" size={16} className="mr-2" />
              {onlineCount} игроков онлайн
            </Badge>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4 grid lg:grid-cols-3 gap-6">
        {/* Game Area */}
        <div className="lg:col-span-2">
          <Card className="border-4" style={{borderColor: '#8B4513', backgroundColor: '#2F2F2F'}}>
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-xl flex items-center gap-2">
                <Icon name="Gamepad2" size={24} />
                3D Мир
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!gameStarted ? (
                <div className="text-center py-12">
                  <div className="mb-6">
                    <Icon name="Play" size={48} className="mx-auto text-green-500 animate-pulse" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">
                    Добро пожаловать в Blockcraft 3D!
                  </h3>
                  <p className="text-gray-300 mb-6">
                    Создавай, строй и исследуй бесконечный мир вместе с друзьями
                  </p>
                  <Button 
                    onClick={() => setGameStarted(true)}
                    className="px-8 py-4 text-lg bg-green-600 hover:bg-green-700 border-2 border-green-400"
                    style={{fontFamily: 'Orbitron, monospace'}}
                  >
                    <Icon name="Play" size={20} className="mr-2" />
                    НАЧАТЬ ИГРУ
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <canvas 
                    ref={canvasRef}
                    width={600}
                    height={400}
                    className="w-full border-2 border-gray-600 bg-sky-300"
                  />
                  
                  {/* Game Controls */}
                  <div className="mt-4 grid grid-cols-3 gap-2 max-w-xs mx-auto">
                    <div></div>
                    <Button 
                      onClick={() => movePlayer('up')}
                      className="bg-gray-700 hover:bg-gray-600 border-2 border-gray-500"
                    >
                      <Icon name="ArrowUp" size={16} />
                    </Button>
                    <div></div>
                    
                    <Button 
                      onClick={() => movePlayer('left')}
                      className="bg-gray-700 hover:bg-gray-600 border-2 border-gray-500"
                    >
                      <Icon name="ArrowLeft" size={16} />
                    </Button>
                    <div className="flex items-center justify-center">
                      <Icon name="User" size={20} className="text-blue-400" />
                    </div>
                    <Button 
                      onClick={() => movePlayer('right')}
                      className="bg-gray-700 hover:bg-gray-600 border-2 border-gray-500"
                    >
                      <Icon name="ArrowRight" size={16} />
                    </Button>
                    
                    <div></div>
                    <Button 
                      onClick={() => movePlayer('down')}
                      className="bg-gray-700 hover:bg-gray-600 border-2 border-gray-500"
                    >
                      <Icon name="ArrowDown" size={16} />
                    </Button>
                    <div></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Multiplayer Panel */}
        <div className="space-y-6">
          {/* Room Info */}
          <Card className="border-4" style={{borderColor: '#8B4513', backgroundColor: '#2F2F2F'}}>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Icon name="Wifi" size={20} />
                Мультиплеер
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-gray-300 text-sm font-medium">Код комнаты</label>
                <div className="mt-1 p-3 bg-gray-800 border-2 border-gray-600 rounded text-white font-mono text-lg text-center">
                  {roomCode}
                </div>
              </div>
              
              <Button className="w-full bg-blue-600 hover:bg-blue-700 border-2 border-blue-400">
                <Icon name="Copy" size={16} className="mr-2" />
                Скопировать код
              </Button>
              
              <Button className="w-full bg-purple-600 hover:bg-purple-700 border-2 border-purple-400">
                <Icon name="Users" size={16} className="mr-2" />
                Создать новую комнату
              </Button>
            </CardContent>
          </Card>

          {/* Game Features */}
          <Card className="border-4" style={{borderColor: '#8B4513', backgroundColor: '#2F2F2F'}}>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Icon name="Zap" size={20} />
                Возможности игры
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-800 rounded border border-gray-600">
                <Icon name="Hammer" size={20} className="text-orange-400" />
                <span className="text-white text-sm">Строительство блоков</span>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-800 rounded border border-gray-600">
                <Icon name="Users" size={20} className="text-blue-400" />
                <span className="text-white text-sm">До 10 игроков</span>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-800 rounded border border-gray-600">
                <Icon name="MessageCircle" size={20} className="text-green-400" />
                <span className="text-white text-sm">Голосовой чат</span>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-800 rounded border border-gray-600">
                <Icon name="Download" size={20} className="text-purple-400" />
                <span className="text-white text-sm">Сохранение миров</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-4" style={{borderColor: '#8B4513', backgroundColor: '#2F2F2F'}}>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Icon name="Settings" size={20} />
                Быстрые действия
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full border-gray-600 text-white hover:bg-gray-700">
                <Icon name="Volume2" size={16} className="mr-2" />
                Настройки звука
              </Button>
              
              <Button variant="outline" className="w-full border-gray-600 text-white hover:bg-gray-700">
                <Icon name="Palette" size={16} className="mr-2" />
                Смена скина
              </Button>
              
              <Button variant="outline" className="w-full border-gray-600 text-white hover:bg-gray-700">
                <Icon name="Share" size={16} className="mr-2" />
                Пригласить друзей
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
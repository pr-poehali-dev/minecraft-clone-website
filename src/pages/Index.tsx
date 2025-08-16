import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

const Index = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [playerPosition, setPlayerPosition] = useState({ x: 5, y: 5 });
  const [roomCode, setRoomCode] = useState('CRAFT-2024');
  const [world, setWorld] = useState<string[][]>([]);
  const [selectedBlock, setSelectedBlock] = useState('grass');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize world
  useEffect(() => {
    const newWorld = Array(16).fill(null).map(() => Array(16).fill('sky'));
    
    // Create terrain
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        if (y > 10) {
          newWorld[y][x] = 'grass';
        } else if (y > 8) {
          newWorld[y][x] = 'dirt';
        } else if (y > 6) {
          newWorld[y][x] = 'stone';
        } else {
          newWorld[y][x] = 'sky';
        }
      }
    }
    
    // Add some trees
    for (let i = 0; i < 5; i++) {
      const treeX = Math.floor(Math.random() * 14) + 1;
      if (newWorld[10][treeX] === 'grass') {
        newWorld[9][treeX] = 'wood';
        newWorld[8][treeX] = 'wood';
        newWorld[7][treeX] = 'leaves';
        if (treeX > 0) newWorld[7][treeX - 1] = 'leaves';
        if (treeX < 15) newWorld[7][treeX + 1] = 'leaves';
      }
    }
    
    setWorld(newWorld);
  }, []);

  // Enhanced 2D pixel rendering
  useEffect(() => {
    if (!canvasRef.current || !gameStarted || world.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const blockSize = 32;
    const offsetX = (canvas.width / 2) - (playerPosition.x * blockSize);
    const offsetY = (canvas.height / 2) - (playerPosition.y * blockSize);

    // Clear canvas
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const blockTextures = {
      sky: '#87CEEB',
      grass: '#228B22',
      dirt: '#8B4513', 
      stone: '#696969',
      wood: '#8B4513',
      leaves: '#32CD32',
      water: '#4169E1',
      sand: '#F4A460'
    };

    // Draw world blocks with pixel borders
    for (let y = 0; y < world.length; y++) {
      for (let x = 0; x < world[y].length; x++) {
        const blockType = world[y][x] as keyof typeof blockTextures;
        if (blockType === 'sky') continue;
        
        const drawX = offsetX + x * blockSize;
        const drawY = offsetY + y * blockSize;
        
        // Skip blocks outside canvas
        if (drawX < -blockSize || drawX > canvas.width || 
            drawY < -blockSize || drawY > canvas.height) continue;
        
        // Draw block
        ctx.fillStyle = blockTextures[blockType];
        ctx.fillRect(drawX, drawY, blockSize, blockSize);
        
        // Add texture details
        if (blockType === 'grass') {
          // Grass texture
          ctx.fillStyle = '#32CD32';
          for (let i = 0; i < 8; i++) {
            const grassX = drawX + Math.random() * blockSize;
            const grassY = drawY + Math.random() * 8;
            ctx.fillRect(grassX, grassY, 2, 2);
          }
        } else if (blockType === 'dirt') {
          // Dirt texture
          ctx.fillStyle = '#A0522D';
          for (let i = 0; i < 6; i++) {
            const dirtX = drawX + Math.random() * blockSize;
            const dirtY = drawY + Math.random() * blockSize;
            ctx.fillRect(dirtX, dirtY, 3, 3);
          }
        } else if (blockType === 'stone') {
          // Stone texture
          ctx.fillStyle = '#A9A9A9';
          for (let i = 0; i < 4; i++) {
            const stoneX = drawX + Math.random() * blockSize;
            const stoneY = drawY + Math.random() * blockSize;
            ctx.fillRect(stoneX, stoneY, 4, 4);
          }
        } else if (blockType === 'wood') {
          // Wood texture
          ctx.fillStyle = '#D2691E';
          for (let i = 0; i < blockSize; i += 4) {
            ctx.fillRect(drawX + i, drawY, 2, blockSize);
          }
        } else if (blockType === 'leaves') {
          // Leaves texture
          ctx.fillStyle = '#228B22';
          for (let i = 0; i < 12; i++) {
            const leafX = drawX + Math.random() * blockSize;
            const leafY = drawY + Math.random() * blockSize;
            ctx.fillRect(leafX, leafY, 2, 2);
          }
        }
        
        // Pixel border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(drawX, drawY, blockSize, blockSize);
      }
    }

    // Draw player with pixel art style
    const playerDrawX = canvas.width / 2 - 8;
    const playerDrawY = canvas.height / 2 - 12;
    
    // Player body
    ctx.fillStyle = '#0066CC';
    ctx.fillRect(playerDrawX, playerDrawY, 16, 20);
    
    // Player head
    ctx.fillStyle = '#FFDBAC';
    ctx.fillRect(playerDrawX + 2, playerDrawY - 8, 12, 8);
    
    // Player eyes
    ctx.fillStyle = '#000000';
    ctx.fillRect(playerDrawX + 4, playerDrawY - 6, 2, 2);
    ctx.fillRect(playerDrawX + 10, playerDrawY - 6, 2, 2);
    
    // Player outline
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.strokeRect(playerDrawX, playerDrawY, 16, 20);
    ctx.strokeRect(playerDrawX + 2, playerDrawY - 8, 12, 8);
    
  }, [gameStarted, playerPosition, world]);

  const movePlayer = (direction: string) => {
    setPlayerPosition(prev => {
      let newX = prev.x;
      let newY = prev.y;
      
      switch(direction) {
        case 'up': newY = Math.max(0, prev.y - 1); break;
        case 'down': newY = Math.min(15, prev.y + 1); break;
        case 'left': newX = Math.max(0, prev.x - 1); break;
        case 'right': newX = Math.min(15, prev.x + 1); break;
      }
      
      // Check collision with solid blocks
      if (world[newY] && world[newY][newX] !== 'sky') {
        return prev; // Can't move into solid block
      }
      
      return { x: newX, y: newY };
    });
  };

  const placeBlock = (mouseX: number, mouseY: number) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = mouseX - rect.left;
    const clickY = mouseY - rect.top;
    
    const blockSize = 32;
    const offsetX = (canvas.width / 2) - (playerPosition.x * blockSize);
    const offsetY = (canvas.height / 2) - (playerPosition.y * blockSize);
    
    const blockX = Math.floor((clickX - offsetX) / blockSize);
    const blockY = Math.floor((clickY - offsetY) / blockSize);
    
    if (blockX >= 0 && blockX < 16 && blockY >= 0 && blockY < 16) {
      const newWorld = [...world];
      newWorld[blockY][blockX] = selectedBlock;
      setWorld(newWorld);
    }
  };

  const blockTypes = [
    { name: 'grass', color: '#228B22', icon: '🌱' },
    { name: 'dirt', color: '#8B4513', icon: '🟫' },
    { name: 'stone', color: '#696969', icon: '🗿' },
    { name: 'wood', color: '#8B4513', icon: '🪵' },
    { name: 'leaves', color: '#32CD32', icon: '🍃' },
    { name: 'sky', color: '#87CEEB', icon: '❌' }
  ];

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
            BLOCKCRAFT 2D
          </h1>
        </div>
      </div>

      <div className="container mx-auto p-4 grid lg:grid-cols-3 gap-6">
        {/* Game Area */}
        <div className="lg:col-span-2">
          <Card className="border-4" style={{borderColor: '#8B4513', backgroundColor: '#2F2F2F'}}>
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-xl flex items-center gap-2">
                <Icon name="Gamepad2" size={24} />
                Игровой мир
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!gameStarted ? (
                <div className="text-center py-12">
                  <div className="mb-6">
                    <Icon name="Play" size={48} className="mx-auto text-green-500 animate-pulse" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">
                    Добро пожаловать в Blockcraft 2D!
                  </h3>
                  <p className="text-gray-300 mb-6">
                    Создавай, строй и исследуй пиксельный мир с друзьями
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
                    width={640}
                    height={480}
                    className="w-full border-2 border-gray-600 bg-sky-300 cursor-crosshair"
                    onClick={(e) => placeBlock(e.clientX, e.clientY)}
                    style={{ imageRendering: 'pixelated' }}
                  />
                  
                  {/* Game Controls */}
                  <div className="mt-4 flex justify-between items-start">
                    <div className="grid grid-cols-3 gap-2 max-w-xs">
                      <div></div>
                      <Button 
                        onClick={() => movePlayer('up')}
                        className="bg-gray-700 hover:bg-gray-600 border-2 border-gray-500 text-white"
                      >
                        <Icon name="ArrowUp" size={16} />
                      </Button>
                      <div></div>
                      
                      <Button 
                        onClick={() => movePlayer('left')}
                        className="bg-gray-700 hover:bg-gray-600 border-2 border-gray-500 text-white"
                      >
                        <Icon name="ArrowLeft" size={16} />
                      </Button>
                      <div className="flex items-center justify-center">
                        <Icon name="User" size={20} className="text-blue-400" />
                      </div>
                      <Button 
                        onClick={() => movePlayer('right')}
                        className="bg-gray-700 hover:bg-gray-600 border-2 border-gray-500 text-white"
                      >
                        <Icon name="ArrowRight" size={16} />
                      </Button>
                      
                      <div></div>
                      <Button 
                        onClick={() => movePlayer('down')}
                        className="bg-gray-700 hover:bg-gray-600 border-2 border-gray-500 text-white"
                      >
                        <Icon name="ArrowDown" size={16} />
                      </Button>
                      <div></div>
                    </div>
                    
                    {/* Block Selection */}
                    <div className="flex flex-col gap-2">
                      <h4 className="text-white text-sm font-bold">Блоки:</h4>
                      <div className="grid grid-cols-3 gap-1">
                        {blockTypes.map((block) => (
                          <Button
                            key={block.name}
                            onClick={() => setSelectedBlock(block.name)}
                            className={`w-12 h-12 p-1 border-2 ${
                              selectedBlock === block.name 
                                ? 'border-yellow-400 bg-yellow-600' 
                                : 'border-gray-500 bg-gray-700'
                            } hover:bg-gray-600 text-white`}
                            style={{ backgroundColor: block.color }}
                          >
                            <span className="text-lg">{block.icon}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
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
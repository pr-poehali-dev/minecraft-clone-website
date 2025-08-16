import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

const Index = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [playerPosition, setPlayerPosition] = useState({ x: 50, y: 30 });
  const [playerVelocity, setPlayerVelocity] = useState({ x: 0, y: 0 });
  const [roomCode, setRoomCode] = useState('CRAFT-2024');
  const [world, setWorld] = useState<string[][]>([]);
  const [selectedBlock, setSelectedBlock] = useState('dirt');
  const [isOnGround, setIsOnGround] = useState(false);
  const [keys, setKeys] = useState<{[key: string]: boolean}>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();

  // Generate random world with structures
  const generateWorld = useCallback(() => {
    const worldWidth = 100;
    const worldHeight = 60;
    const newWorld = Array(worldHeight).fill(null).map(() => Array(worldWidth).fill('air'));
    
    // Generate terrain using noise
    const generateHeight = (x: number) => {
      return Math.floor(40 + Math.sin(x * 0.1) * 5 + Math.sin(x * 0.05) * 3 + Math.random() * 4);
    };
    
    // Create base terrain
    for (let x = 0; x < worldWidth; x++) {
      const surfaceHeight = generateHeight(x);
      
      for (let y = surfaceHeight; y < worldHeight; y++) {
        if (y === surfaceHeight) {
          newWorld[y][x] = 'grass';
        } else if (y < surfaceHeight + 5) {
          newWorld[y][x] = 'dirt';
        } else {
          newWorld[y][x] = 'stone';
        }
      }
    }
    
    // Add caves
    for (let i = 0; i < 20; i++) {
      const caveX = Math.floor(Math.random() * worldWidth);
      const caveY = Math.floor(Math.random() * 20 + 45);
      const caveSize = Math.floor(Math.random() * 8 + 3);
      
      for (let dx = -caveSize; dx <= caveSize; dx++) {
        for (let dy = -caveSize; dy <= caveSize; dy++) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < caveSize && 
              caveX + dx >= 0 && caveX + dx < worldWidth &&
              caveY + dy >= 0 && caveY + dy < worldHeight) {
            newWorld[caveY + dy][caveX + dx] = 'air';
          }
        }
      }
    }
    
    // Add trees
    for (let x = 5; x < worldWidth - 5; x += Math.floor(Math.random() * 8 + 3)) {
      const surfaceHeight = generateHeight(x);
      if (newWorld[surfaceHeight][x] === 'grass' && Math.random() > 0.3) {
        const treeHeight = Math.floor(Math.random() * 4 + 3);
        
        // Tree trunk
        for (let y = 0; y < treeHeight; y++) {
          if (surfaceHeight - y - 1 >= 0) {
            newWorld[surfaceHeight - y - 1][x] = 'wood';
          }
        }
        
        // Tree leaves
        const leafY = surfaceHeight - treeHeight;
        for (let dx = -2; dx <= 2; dx++) {
          for (let dy = -2; dy <= 1; dy++) {
            if (leafY + dy >= 0 && leafY + dy < worldHeight &&
                x + dx >= 0 && x + dx < worldWidth &&
                Math.abs(dx) + Math.abs(dy) <= 2) {
              if (newWorld[leafY + dy][x + dx] === 'air') {
                newWorld[leafY + dy][x + dx] = 'leaves';
              }
            }
          }
        }
      }
    }
    
    // Add structures - simple houses
    for (let i = 0; i < 3; i++) {
      const houseX = Math.floor(Math.random() * (worldWidth - 10)) + 5;
      const surfaceHeight = generateHeight(houseX);
      
      // Clear area for house
      for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 6; y++) {
          if (surfaceHeight - y >= 0 && houseX + x < worldWidth) {
            newWorld[surfaceHeight - y][houseX + x] = 'air';
          }
        }
      }
      
      // Build house walls
      for (let x = 0; x < 8; x++) {
        for (let y = 0; y < 5; y++) {
          if ((x === 0 || x === 7 || y === 0) && 
              surfaceHeight - y >= 0 && houseX + x < worldWidth) {
            newWorld[surfaceHeight - y][houseX + x] = 'wood';
          }
        }
      }
      
      // Add door
      if (surfaceHeight >= 0 && surfaceHeight - 1 >= 0) {
        newWorld[surfaceHeight][houseX + 3] = 'air';
        newWorld[surfaceHeight - 1][houseX + 3] = 'air';
      }
    }
    
    setWorld(newWorld);
  }, []);

  // Initialize world
  useEffect(() => {
    generateWorld();
  }, [generateWorld]);

  // Check if block is solid
  const isSolid = (blockType: string) => {
    return blockType !== 'air' && blockType !== undefined;
  };

  // Check collision
  const checkCollision = (x: number, y: number, width: number = 1, height: number = 2) => {
    const left = Math.floor(x);
    const right = Math.floor(x + width - 0.1);
    const top = Math.floor(y);
    const bottom = Math.floor(y + height - 0.1);
    
    for (let checkY = top; checkY <= bottom; checkY++) {
      for (let checkX = left; checkX <= right; checkX++) {
        if (checkY >= 0 && checkY < world.length && 
            checkX >= 0 && checkX < world[0]?.length &&
            isSolid(world[checkY][checkX])) {
          return true;
        }
      }
    }
    return false;
  };

  // Game physics loop
  useEffect(() => {
    if (!gameStarted || world.length === 0) return;

    const gameLoop = () => {
      setPlayerVelocity(prevVel => {
        let newVelX = prevVel.x * 0.8; // Friction
        let newVelY = prevVel.y + 0.5; // Gravity
        
        // Handle input
        if (keys['a'] || keys['A'] || keys['ArrowLeft']) {
          newVelX = Math.max(newVelX - 0.5, -5);
        }
        if (keys['d'] || keys['D'] || keys['ArrowRight']) {
          newVelX = Math.min(newVelX + 0.5, 5);
        }
        
        // Jump
        if ((keys['w'] || keys['W'] || keys[' '] || keys['ArrowUp']) && isOnGround) {
          newVelY = -10;
        }
        
        // Terminal velocity
        newVelY = Math.min(newVelY, 15);
        
        return { x: newVelX, y: newVelY };
      });
      
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameStarted, world, keys, isOnGround]);

  // Apply velocity to position
  useEffect(() => {
    if (!gameStarted || world.length === 0) return;
    
    setPlayerPosition(prevPos => {
      let newX = prevPos.x;
      let newY = prevPos.y;
      
      // Move horizontally
      const newXPos = prevPos.x + playerVelocity.x * 0.1;
      if (!checkCollision(newXPos, prevPos.y)) {
        newX = newXPos;
      } else {
        setPlayerVelocity(prev => ({ ...prev, x: 0 }));
      }
      
      // Move vertically
      const newYPos = prevPos.y + playerVelocity.y * 0.1;
      if (!checkCollision(newX, newYPos)) {
        newY = newYPos;
        setIsOnGround(false);
      } else {
        if (playerVelocity.y > 0) {
          // Landing
          setIsOnGround(true);
        }
        setPlayerVelocity(prev => ({ ...prev, y: 0 }));
      }
      
      // Keep player in bounds
      newX = Math.max(0, Math.min(newX, world[0]?.length - 1));
      newY = Math.max(0, Math.min(newY, world.length - 2));
      
      return { x: newX, y: newY };
    });
  }, [playerVelocity, world, gameStarted]);

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys(prev => ({ ...prev, [e.key]: true }));
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys(prev => ({ ...prev, [e.key]: false }));
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Enhanced 2D rendering
  useEffect(() => {
    if (!canvasRef.current || !gameStarted || world.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const blockSize = 16;
    const viewWidth = Math.floor(canvas.width / blockSize);
    const viewHeight = Math.floor(canvas.height / blockSize);
    
    // Camera follows player
    const cameraX = Math.floor(playerPosition.x - viewWidth / 2);
    const cameraY = Math.floor(playerPosition.y - viewHeight / 2);

    // Clear canvas
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const blockTextures = {
      air: null,
      grass: '#228B22',
      dirt: '#8B4513', 
      stone: '#696969',
      wood: '#8B4513',
      leaves: '#32CD32',
      water: '#4169E1',
      sand: '#F4A460'
    };

    // Draw world blocks
    for (let y = Math.max(0, cameraY); y < Math.min(world.length, cameraY + viewHeight + 1); y++) {
      for (let x = Math.max(0, cameraX); x < Math.min(world[0].length, cameraX + viewWidth + 1); x++) {
        const blockType = world[y][x] as keyof typeof blockTextures;
        const color = blockTextures[blockType];
        if (!color) continue;
        
        const drawX = (x - cameraX) * blockSize;
        const drawY = (y - cameraY) * blockSize;
        
        // Draw block
        ctx.fillStyle = color;
        ctx.fillRect(drawX, drawY, blockSize, blockSize);
        
        // Add simple texture
        if (blockType === 'grass') {
          ctx.fillStyle = '#32CD32';
          ctx.fillRect(drawX, drawY, blockSize, 4);
        } else if (blockType === 'stone') {
          ctx.fillStyle = '#A9A9A9';
          ctx.fillRect(drawX + 2, drawY + 2, 4, 4);
          ctx.fillRect(drawX + 10, drawY + 8, 4, 4);
        }
        
        // Outline
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(drawX, drawY, blockSize, blockSize);
      }
    }

    // Draw player
    const playerScreenX = (playerPosition.x - cameraX) * blockSize;
    const playerScreenY = (playerPosition.y - cameraY) * blockSize;
    
    // Player body
    ctx.fillStyle = '#0066CC';
    ctx.fillRect(playerScreenX, playerScreenY, blockSize, blockSize * 2);
    
    // Player head
    ctx.fillStyle = '#FFDBAC';
    ctx.fillRect(playerScreenX + 2, playerScreenY - 8, blockSize - 4, 8);
    
    // Player eyes
    ctx.fillStyle = '#000000';
    ctx.fillRect(playerScreenX + 4, playerScreenY - 6, 2, 2);
    ctx.fillRect(playerScreenX + 10, playerScreenY - 6, 2, 2);
    
  }, [gameStarted, playerPosition, world]);

  // Handle block placement
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const blockSize = 16;
    const viewWidth = Math.floor(canvas.width / blockSize);
    const viewHeight = Math.floor(canvas.height / blockSize);
    const cameraX = Math.floor(playerPosition.x - viewWidth / 2);
    const cameraY = Math.floor(playerPosition.y - viewHeight / 2);
    
    const worldX = Math.floor(clickX / blockSize) + cameraX;
    const worldY = Math.floor(clickY / blockSize) + cameraY;
    
    if (worldX >= 0 && worldX < world[0]?.length && 
        worldY >= 0 && worldY < world.length) {
      
      // Check distance from player
      const distance = Math.sqrt(
        Math.pow(worldX - playerPosition.x, 2) + 
        Math.pow(worldY - playerPosition.y, 2)
      );
      
      if (distance <= 5) { // Build range
        const newWorld = [...world];
        
        if (e.type === 'click') { // Left click - place block
          if (newWorld[worldY][worldX] === 'air') {
            newWorld[worldY][worldX] = selectedBlock;
          }
        }
        
        setWorld(newWorld);
      }
    }
  };

  // Handle right click for removing blocks
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    const blockSize = 16;
    const viewWidth = Math.floor(canvas.width / blockSize);
    const viewHeight = Math.floor(canvas.height / blockSize);
    const cameraX = Math.floor(playerPosition.x - viewWidth / 2);
    const cameraY = Math.floor(playerPosition.y - viewHeight / 2);
    
    const worldX = Math.floor(clickX / blockSize) + cameraX;
    const worldY = Math.floor(clickY / blockSize) + cameraY;
    
    if (worldX >= 0 && worldX < world[0]?.length && 
        worldY >= 0 && worldY < world.length) {
      
      const distance = Math.sqrt(
        Math.pow(worldX - playerPosition.x, 2) + 
        Math.pow(worldY - playerPosition.y, 2)
      );
      
      if (distance <= 5) {
        const newWorld = [...world];
        if (newWorld[worldY][worldX] !== 'air') {
          newWorld[worldY][worldX] = 'air';
        }
        setWorld(newWorld);
      }
    }
  };

  const blockTypes = [
    { name: 'dirt', color: '#8B4513', icon: '🟫' },
    { name: 'stone', color: '#696969', icon: '🗿' },
    { name: 'wood', color: '#8B4513', icon: '🪵' },
    { name: 'grass', color: '#228B22', icon: '🌱' },
    { name: 'leaves', color: '#32CD32', icon: '🍃' }
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
                    Исследуй процедурно-генерируемый мир с пещерами, деревьями и структурами
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
                    width={800}
                    height={480}
                    className="w-full border-2 border-gray-600 bg-sky-300 cursor-crosshair"
                    onClick={handleCanvasClick}
                    onContextMenu={handleContextMenu}
                    style={{ imageRendering: 'pixelated' }}
                  />
                  
                  {/* Controls Info */}
                  <div className="mt-4 flex justify-between items-start">
                    <div className="text-white text-sm">
                      <p><strong>Управление:</strong></p>
                      <p>A/D - движение, W/Space - прыжок</p>
                      <p>ЛКМ - поставить блок, ПКМ - убрать</p>
                    </div>
                    
                    {/* Block Selection */}
                    <div className="flex flex-col gap-2">
                      <h4 className="text-white text-sm font-bold">Блоки:</h4>
                      <div className="flex gap-1">
                        {blockTypes.map((block) => (
                          <Button
                            key={block.name}
                            onClick={() => setSelectedBlock(block.name)}
                            className={`w-12 h-12 p-1 border-2 ${
                              selectedBlock === block.name 
                                ? 'border-yellow-400 bg-yellow-600' 
                                : 'border-gray-500 bg-gray-700'
                            } hover:bg-gray-600 text-white`}
                            style={{ backgroundColor: selectedBlock === block.name ? '#FFD700' : block.color }}
                          >
                            <span className="text-lg">{block.icon}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Regenerate World Button */}
                  <div className="mt-4 text-center">
                    <Button 
                      onClick={generateWorld}
                      className="bg-purple-600 hover:bg-purple-700 border-2 border-purple-400"
                    >
                      <Icon name="RefreshCw" size={16} className="mr-2" />
                      Новый мир
                    </Button>
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

          {/* Game Stats */}
          <Card className="border-4" style={{borderColor: '#8B4513', backgroundColor: '#2F2F2F'}}>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Icon name="BarChart3" size={20} />
                Статистика
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-white text-sm">
                <p>Позиция: X:{Math.floor(playerPosition.x)}, Y:{Math.floor(playerPosition.y)}</p>
                <p>На земле: {isOnGround ? 'Да' : 'Нет'}</p>
                <p>Скорость: {Math.abs(playerVelocity.x).toFixed(1)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Game Features */}
          <Card className="border-4" style={{borderColor: '#8B4513', backgroundColor: '#2F2F2F'}}>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Icon name="Zap" size={20} />
                Возможности
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-gray-800 rounded border border-gray-600">
                <Icon name="Mountain" size={20} className="text-green-400" />
                <span className="text-white text-sm">Процедурная генерация</span>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-800 rounded border border-gray-600">
                <Icon name="Hammer" size={20} className="text-orange-400" />
                <span className="text-white text-sm">Строительство</span>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-800 rounded border border-gray-600">
                <Icon name="Home" size={20} className="text-blue-400" />
                <span className="text-white text-sm">Структуры и дома</span>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-800 rounded border border-gray-600">
                <Icon name="Zap" size={20} className="text-yellow-400" />
                <span className="text-white text-sm">Реалистичная физика</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
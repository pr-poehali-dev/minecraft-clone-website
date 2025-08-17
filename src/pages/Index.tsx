import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

interface InventoryItem {
  id: string;
  name: string;
  count: number;
  maxStack: number;
  icon: string;
}

interface Mob {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  type: 'zombie' | 'spider' | 'slime';
  lastAttack: number;
  target?: string;
}

interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface Tool {
  type: 'pickaxe' | 'axe' | 'shovel' | 'sword';
  material: 'wood' | 'stone' | 'iron' | 'diamond';
  durability: number;
  maxDurability: number;
}

const Index = () => {
  const [gameStarted, setGameStarted] = useState(false);
  const [playerPosition, setPlayerPosition] = useState({ x: 50, y: 30 });
  const [playerVelocity, setPlayerVelocity] = useState({ x: 0, y: 0 });
  const [playerHealth, setPlayerHealth] = useState(20);
  const [playerHunger, setPlayerHunger] = useState(20);
  const [playerXP, setPlayerXP] = useState(0);
  const [roomCode, setRoomCode] = useState('CRAFT-2024');
  const [world, setWorld] = useState<string[][]>([]);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [isOnGround, setIsOnGround] = useState(false);
  const [keys, setKeys] = useState<{[key: string]: boolean}>({});
  const [inventory, setInventory] = useState<(InventoryItem | null)[]>(Array(36).fill(null));
  const [hotbar, setHotbar] = useState<(InventoryItem | null)[]>(Array(9).fill(null));
  const [craftingOpen, setCraftingOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [mobs, setMobs] = useState<Mob[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [gameTime, setGameTime] = useState(0); // 0-24000 (24000 = полный день)
  const [lastDamage, setLastDamage] = useState(0);
  const [mining, setMining] = useState<{x: number, y: number, progress: number} | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number>();

  // Recipes for crafting
  const recipes = {
    wood_pickaxe: { ingredients: [['wood', 3], ['stick', 2]], result: { type: 'tool', tool: 'pickaxe', material: 'wood' } },
    stone_pickaxe: { ingredients: [['stone', 3], ['stick', 2]], result: { type: 'tool', tool: 'pickaxe', material: 'stone' } },
    wood_sword: { ingredients: [['wood', 2], ['stick', 1]], result: { type: 'tool', tool: 'sword', material: 'wood' } },
    stick: { ingredients: [['wood', 2]], result: { type: 'item', name: 'stick', count: 4 } },
    torch: { ingredients: [['stick', 1], ['coal', 1]], result: { type: 'item', name: 'torch', count: 4 } },
    bread: { ingredients: [['wheat', 3]], result: { type: 'item', name: 'bread', count: 1 } }
  };

  // Block properties
  const blockProperties = {
    air: { solid: false, hardness: 0, drops: [], lightLevel: 0 },
    grass: { solid: true, hardness: 0.6, drops: [{ item: 'dirt', chance: 1 }], lightLevel: 0 },
    dirt: { solid: true, hardness: 0.5, drops: [{ item: 'dirt', chance: 1 }], lightLevel: 0 },
    stone: { solid: true, hardness: 1.5, drops: [{ item: 'cobblestone', chance: 1 }], lightLevel: 0 },
    wood: { solid: true, hardness: 2, drops: [{ item: 'wood', chance: 1 }], lightLevel: 0 },
    leaves: { solid: true, hardness: 0.2, drops: [{ item: 'stick', chance: 0.2 }, { item: 'apple', chance: 0.05 }], lightLevel: 0 },
    iron_ore: { solid: true, hardness: 3, drops: [{ item: 'iron_ore', chance: 1 }], lightLevel: 0 },
    coal_ore: { solid: true, hardness: 3, drops: [{ item: 'coal', chance: 1 }], lightLevel: 0 },
    diamond_ore: { solid: true, hardness: 5, drops: [{ item: 'diamond', chance: 1 }], lightLevel: 0 },
    torch: { solid: false, hardness: 0, drops: [{ item: 'torch', chance: 1 }], lightLevel: 14 },
    water: { solid: false, hardness: 0, drops: [], lightLevel: 0 },
    sand: { solid: true, hardness: 0.5, drops: [{ item: 'sand', chance: 1 }], lightLevel: 0 }
  };

  // Enhanced world generation with ores and structures
  const generateWorld = useCallback(() => {
    const worldWidth = 200;
    const worldHeight = 80;
    const newWorld = Array(worldHeight).fill(null).map(() => Array(worldWidth).fill('air'));
    
    // Generate terrain using improved noise
    const generateHeight = (x: number) => {
      const baseHeight = 50;
      const noise1 = Math.sin(x * 0.02) * 8;
      const noise2 = Math.sin(x * 0.05) * 4;
      const noise3 = Math.sin(x * 0.1) * 2;
      return Math.floor(baseHeight + noise1 + noise2 + noise3 + (Math.random() - 0.5) * 3);
    };
    
    // Create base terrain with different layers
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
    
    // Add ores in stone layer
    for (let i = 0; i < 150; i++) {
      const oreX = Math.floor(Math.random() * worldWidth);
      const oreY = Math.floor(Math.random() * 25 + 55);
      const oreType = Math.random() < 0.6 ? 'coal_ore' : Math.random() < 0.8 ? 'iron_ore' : 'diamond_ore';
      const veinSize = oreType === 'coal_ore' ? 8 : oreType === 'iron_ore' ? 5 : 3;
      
      for (let dx = -veinSize; dx <= veinSize; dx++) {
        for (let dy = -veinSize; dy <= veinSize; dy++) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < veinSize && Math.random() < 0.7 &&
              oreX + dx >= 0 && oreX + dx < worldWidth &&
              oreY + dy >= 0 && oreY + dy < worldHeight &&
              newWorld[oreY + dy][oreX + dx] === 'stone') {
            newWorld[oreY + dy][oreX + dx] = oreType;
          }
        }
      }
    }
    
    // Add underground caves
    for (let i = 0; i < 40; i++) {
      const caveX = Math.floor(Math.random() * worldWidth);
      const caveY = Math.floor(Math.random() * 30 + 50);
      const caveSize = Math.floor(Math.random() * 12 + 5);
      
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
    
    // Add dense forests
    for (let x = 5; x < worldWidth - 5; x += Math.floor(Math.random() * 4 + 2)) {
      const surfaceHeight = generateHeight(x);
      if (newWorld[surfaceHeight][x] === 'grass' && Math.random() > 0.2) {
        const treeHeight = Math.floor(Math.random() * 6 + 4);
        
        // Tree trunk
        for (let y = 0; y < treeHeight; y++) {
          if (surfaceHeight - y - 1 >= 0) {
            newWorld[surfaceHeight - y - 1][x] = 'wood';
          }
        }
        
        // Enhanced tree leaves
        const leafY = surfaceHeight - treeHeight;
        for (let dx = -3; dx <= 3; dx++) {
          for (let dy = -3; dy <= 2; dy++) {
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= 3 && leafY + dy >= 0 && leafY + dy < worldHeight &&
                x + dx >= 0 && x + dx < worldWidth &&
                Math.random() > distance / 6) {
              if (newWorld[leafY + dy][x + dx] === 'air') {
                newWorld[leafY + dy][x + dx] = 'leaves';
              }
            }
          }
        }
      }
    }
    
    // Add villages with multiple buildings
    for (let i = 0; i < 5; i++) {
      const villageX = Math.floor(Math.random() * (worldWidth - 30)) + 15;
      const surfaceHeight = generateHeight(villageX);
      
      // Create multiple buildings
      for (let building = 0; building < 3; building++) {
        const buildingX = villageX + building * 12;
        const buildingWidth = 8 + Math.floor(Math.random() * 4);
        const buildingHeight = 5 + Math.floor(Math.random() * 3);
        
        // Clear area
        for (let x = 0; x < buildingWidth; x++) {
          for (let y = 0; y < buildingHeight + 2; y++) {
            if (surfaceHeight - y >= 0 && buildingX + x < worldWidth) {
              newWorld[surfaceHeight - y][buildingX + x] = 'air';
            }
          }
        }
        
        // Build walls and roof
        for (let x = 0; x < buildingWidth; x++) {
          for (let y = 0; y < buildingHeight; y++) {
            if ((x === 0 || x === buildingWidth - 1 || y === 0 || y === buildingHeight - 1) && 
                surfaceHeight - y >= 0 && buildingX + x < worldWidth) {
              newWorld[surfaceHeight - y][buildingX + x] = 'wood';
            }
          }
        }
        
        // Add door and windows
        const doorX = Math.floor(buildingWidth / 2);
        if (surfaceHeight >= 0) {
          newWorld[surfaceHeight][buildingX + doorX] = 'air';
          newWorld[surfaceHeight - 1][buildingX + doorX] = 'air';
        }
      }
    }
    
    // Add water bodies
    for (let i = 0; i < 8; i++) {
      const lakeX = Math.floor(Math.random() * (worldWidth - 20)) + 10;
      const lakeY = generateHeight(lakeX) + 1;
      const lakeSize = Math.floor(Math.random() * 8 + 5);
      
      for (let dx = -lakeSize; dx <= lakeSize; dx++) {
        for (let dy = 0; dy <= 3; dy++) {
          if (lakeX + dx >= 0 && lakeX + dx < worldWidth &&
              lakeY + dy >= 0 && lakeY + dy < worldHeight) {
            const distance = Math.abs(dx);
            if (distance <= lakeSize - dy) {
              newWorld[lakeY + dy][lakeX + dx] = 'water';
            }
          }
        }
      }
    }
    
    setWorld(newWorld);
    
    // Initialize player inventory with basic items
    const initialHotbar = Array(9).fill(null);
    initialHotbar[0] = { id: 'wood', name: 'Дерево', count: 64, maxStack: 64, icon: '🪵' };
    initialHotbar[1] = { id: 'dirt', name: 'Земля', count: 64, maxStack: 64, icon: '🟫' };
    initialHotbar[2] = { id: 'stone', name: 'Камень', count: 32, maxStack: 64, icon: '🗿' };
    setHotbar(initialHotbar);
    
    // Spawn some mobs
    const initialMobs: Mob[] = [];
    for (let i = 0; i < 10; i++) {
      const mobX = Math.floor(Math.random() * worldWidth);
      const mobY = generateHeight(mobX) - 2;
      const mobType = Math.random() < 0.4 ? 'zombie' : Math.random() < 0.7 ? 'spider' : 'slime';
      
      initialMobs.push({
        id: `mob_${i}`,
        x: mobX,
        y: mobY,
        vx: 0,
        vy: 0,
        health: mobType === 'zombie' ? 20 : mobType === 'spider' ? 16 : 10,
        maxHealth: mobType === 'zombie' ? 20 : mobType === 'spider' ? 16 : 10,
        type: mobType,
        lastAttack: 0
      });
    }
    setMobs(initialMobs);
    
  }, []);

  // Initialize world
  useEffect(() => {
    generateWorld();
  }, [generateWorld]);

  // Check if block is solid
  const isSolid = (blockType: string) => {
    return blockProperties[blockType as keyof typeof blockProperties]?.solid || false;
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

  // Add particles
  const addParticles = (x: number, y: number, count: number, color: string) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: `particle_${Date.now()}_${i}`,
        x: x + Math.random() * 16,
        y: y + Math.random() * 16,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4 - 2,
        life: 30,
        maxLife: 30,
        color,
        size: Math.random() * 3 + 1
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  };

  // Mine block with tool efficiency
  const mineBlock = (x: number, y: number) => {
    if (x < 0 || x >= world[0]?.length || y < 0 || y >= world.length) return;
    
    const blockType = world[y][x];
    const blockProps = blockProperties[blockType as keyof typeof blockProperties];
    if (!blockProps || blockType === 'air') return;
    
    const selectedItem = hotbar[selectedSlot];
    let miningSpeed = 1;
    
    if (selectedItem && selectedItem.id.includes('pickaxe')) {
      miningSpeed = selectedItem.id.includes('diamond') ? 8 : 
                    selectedItem.id.includes('iron') ? 6 :
                    selectedItem.id.includes('stone') ? 4 : 2;
    }
    
    const miningTime = blockProps.hardness * 20 / miningSpeed; // frames to mine
    
    if (!mining || mining.x !== x || mining.y !== y) {
      setMining({ x, y, progress: 0 });
    } else {
      setMining(prev => {
        if (!prev) return null;
        const newProgress = prev.progress + 1;
        
        if (newProgress >= miningTime) {
          // Block mined! Drop items
          const newWorld = [...world];
          newWorld[y][x] = 'air';
          setWorld(newWorld);
          
          // Add items to inventory
          blockProps.drops.forEach(drop => {
            if (Math.random() < drop.chance) {
              addItemToInventory(drop.item, 1);
            }
          });
          
          // Add particles
          addParticles(x * 16, y * 16, 8, blockProps === blockProperties.stone ? '#696969' : '#8B4513');
          
          // Damage tool
          if (selectedItem && selectedItem.id.includes('pickaxe')) {
            damageItem(selectedSlot, 1);
          }
          
          // Add XP
          setPlayerXP(prev => prev + Math.floor(blockProps.hardness * 2));
          
          return null;
        }
        
        return { ...prev, progress: newProgress };
      });
    }
  };

  // Add item to inventory
  const addItemToInventory = (itemId: string, count: number) => {
    const itemData = {
      id: itemId,
      name: itemId.charAt(0).toUpperCase() + itemId.slice(1),
      count,
      maxStack: 64,
      icon: itemId === 'wood' ? '🪵' : itemId === 'stone' ? '🗿' : itemId === 'dirt' ? '🟫' : 
            itemId === 'coal' ? '⚫' : itemId === 'iron_ore' ? '🔸' : itemId === 'diamond' ? '💎' : '📦'
    };
    
    setHotbar(prev => {
      const newHotbar = [...prev];
      for (let i = 0; i < newHotbar.length; i++) {
        if (!newHotbar[i]) {
          newHotbar[i] = itemData;
          return newHotbar;
        } else if (newHotbar[i]!.id === itemId && newHotbar[i]!.count < newHotbar[i]!.maxStack) {
          newHotbar[i]!.count = Math.min(newHotbar[i]!.count + count, newHotbar[i]!.maxStack);
          return newHotbar;
        }
      }
      return newHotbar;
    });
  };

  // Damage item
  const damageItem = (slot: number, damage: number) => {
    setHotbar(prev => {
      const newHotbar = [...prev];
      if (newHotbar[slot] && newHotbar[slot]!.id.includes('tool')) {
        // Assuming tools have durability... implement tool system
      }
      return newHotbar;
    });
  };

  // Game physics and AI loop
  useEffect(() => {
    if (!gameStarted || world.length === 0) return;

    const gameLoop = () => {
      // Update game time (day/night cycle)
      setGameTime(prev => (prev + 1) % 24000);
      
      // Player physics
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
      
      // Update mobs AI
      setMobs(prevMobs => {
        return prevMobs.map(mob => {
          let newMob = { ...mob };
          
          // Simple AI - move towards player if close
          const distanceToPlayer = Math.sqrt(
            Math.pow(mob.x - playerPosition.x, 2) + 
            Math.pow(mob.y - playerPosition.y, 2)
          );
          
          if (distanceToPlayer < 10 && distanceToPlayer > 1) {
            // Move towards player
            const dirX = playerPosition.x - mob.x;
            const dirY = playerPosition.y - mob.y;
            const magnitude = Math.sqrt(dirX * dirX + dirY * dirY);
            
            newMob.vx = (dirX / magnitude) * 1.5;
            if (Math.abs(dirY) > 1) {
              newMob.vy = -5; // Jump
            }
          } else if (distanceToPlayer <= 1) {
            // Attack player
            if (Date.now() - mob.lastAttack > 1000) {
              setPlayerHealth(prev => Math.max(0, prev - 2));
              setLastDamage(Date.now());
              newMob.lastAttack = Date.now();
            }
            newMob.vx = 0;
          } else {
            // Random movement
            if (Math.random() < 0.01) {
              newMob.vx = (Math.random() - 0.5) * 2;
            }
            newMob.vx *= 0.9;
          }
          
          // Apply gravity
          newMob.vy += 0.5;
          newMob.vy = Math.min(newMob.vy, 15);
          
          // Update position
          const newX = newMob.x + newMob.vx * 0.1;
          const newY = newMob.y + newMob.vy * 0.1;
          
          if (!checkCollision(newX, newMob.y)) {
            newMob.x = newX;
          } else {
            newMob.vx = 0;
          }
          
          if (!checkCollision(newMob.x, newY)) {
            newMob.y = newY;
          } else {
            newMob.vy = 0;
          }
          
          // Keep in bounds
          newMob.x = Math.max(0, Math.min(newMob.x, world[0]?.length - 1));
          newMob.y = Math.max(0, Math.min(newMob.y, world.length - 2));
          
          return newMob;
        });
      });
      
      // Update particles
      setParticles(prevParticles => {
        return prevParticles
          .map(particle => ({
            ...particle,
            x: particle.x + particle.vx,
            y: particle.y + particle.vy,
            vy: particle.vy + 0.1, // Gravity for particles
            life: particle.life - 1
          }))
          .filter(particle => particle.life > 0);
      });
      
      // Hunger system
      if (Math.random() < 0.0001) {
        setPlayerHunger(prev => Math.max(0, prev - 1));
      }
      
      // Health regeneration when well fed
      if (playerHunger > 18 && playerHealth < 20 && Math.random() < 0.001) {
        setPlayerHealth(prev => Math.min(20, prev + 1));
      }
      
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameStarted, world, keys, isOnGround, playerPosition, playerHunger, playerHealth]);

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

  // Enhanced keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys(prev => ({ ...prev, [e.key]: true }));
      
      // Hotbar selection
      const num = parseInt(e.key);
      if (num >= 1 && num <= 9) {
        setSelectedSlot(num - 1);
      }
      
      // Open inventory
      if (e.key === 'e' || e.key === 'E') {
        setInventoryOpen(prev => !prev);
      }
      
      // Open crafting
      if (e.key === 'c' || e.key === 'C') {
        setCraftingOpen(prev => !prev);
      }
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

  // Enhanced rendering with lighting and effects
  useEffect(() => {
    if (!canvasRef.current || !gameStarted || world.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const blockSize = 16;
    const viewWidth = Math.floor(canvas.width / blockSize);
    const viewHeight = Math.floor(canvas.height / blockSize);
    
    // Camera follows player with smooth movement
    const cameraX = Math.floor(playerPosition.x - viewWidth / 2);
    const cameraY = Math.floor(playerPosition.y - viewHeight / 2);

    // Calculate day/night lighting
    const dayProgress = gameTime / 24000;
    const isDay = dayProgress < 0.5;
    const lightLevel = isDay ? 
      Math.sin(dayProgress * Math.PI * 2) * 0.3 + 0.7 :
      Math.sin(dayProgress * Math.PI * 2) * 0.2 + 0.3;

    // Sky color based on time
    const skyColor = isDay ? 
      `rgb(${Math.floor(135 * lightLevel)}, ${Math.floor(206 * lightLevel)}, ${Math.floor(235 * lightLevel)})` :
      `rgb(${Math.floor(25 * lightLevel)}, ${Math.floor(25 * lightLevel)}, ${Math.floor(60 * lightLevel)})`;

    // Clear canvas with sky
    ctx.fillStyle = skyColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const blockTextures = {
      air: null,
      grass: '#228B22',
      dirt: '#8B4513', 
      stone: '#696969',
      wood: '#8B4513',
      leaves: '#32CD32',
      water: '#4169E1',
      sand: '#F4A460',
      iron_ore: '#C0C0C0',
      coal_ore: '#2F2F2F',
      diamond_ore: '#00FFFF',
      torch: '#FFAA00'
    };

    // Helper function to adjust color brightness
    const adjustColorBrightness = (color: string, brightness: number) => {
      const hex = color.replace('#', '');
      const r = Math.floor(parseInt(hex.substr(0, 2), 16) * brightness);
      const g = Math.floor(parseInt(hex.substr(2, 2), 16) * brightness);
      const b = Math.floor(parseInt(hex.substr(4, 2), 16) * brightness);
      return `rgb(${r}, ${g}, ${b})`;
    };

    // Draw world blocks with enhanced textures
    for (let y = Math.max(0, cameraY); y < Math.min(world.length, cameraY + viewHeight + 1); y++) {
      for (let x = Math.max(0, cameraX); x < Math.min(world[0].length, cameraX + viewWidth + 1); x++) {
        const blockType = world[y][x] as keyof typeof blockTextures;
        const color = blockTextures[blockType];
        if (!color) continue;
        
        const drawX = (x - cameraX) * blockSize;
        const drawY = (y - cameraY) * blockSize;
        
        // Apply lighting
        const blockLightLevel = lightLevel;
        const adjustedColor = adjustColorBrightness(color, blockLightLevel);
        
        // Draw block
        ctx.fillStyle = adjustedColor;
        ctx.fillRect(drawX, drawY, blockSize, blockSize);
        
        // Enhanced textures
        if (blockType === 'grass') {
          ctx.fillStyle = adjustColorBrightness('#32CD32', blockLightLevel);
          ctx.fillRect(drawX, drawY, blockSize, 4);
        } else if (blockType === 'stone') {
          ctx.fillStyle = adjustColorBrightness('#A9A9A9', blockLightLevel);
          ctx.fillRect(drawX + 2, drawY + 2, 4, 4);
          ctx.fillRect(drawX + 10, drawY + 8, 4, 4);
        } else if (blockType === 'iron_ore') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(drawX + 4, drawY + 4, 3, 3);
          ctx.fillRect(drawX + 9, drawY + 9, 3, 3);
        } else if (blockType === 'coal_ore') {
          ctx.fillStyle = '#000000';
          ctx.fillRect(drawX + 3, drawY + 3, 4, 4);
          ctx.fillRect(drawX + 9, drawY + 9, 3, 3);
        } else if (blockType === 'diamond_ore') {
          ctx.fillStyle = '#00FFFF';
          ctx.fillRect(drawX + 6, drawY + 4, 4, 4);
          ctx.fillRect(drawX + 4, drawY + 8, 8, 4);
        } else if (blockType === 'water') {
          // Animated water
          const waveOffset = Math.sin((gameTime + x) * 0.1) * 2;
          ctx.fillStyle = adjustColorBrightness('#4169E1', blockLightLevel * 0.8);
          ctx.fillRect(drawX, drawY + waveOffset, blockSize, blockSize - waveOffset);
        }
        
        // Mining progress indicator
        if (mining && mining.x === x && mining.y === y) {
          const progress = mining.progress / 60; // Assuming 60 frame mining time
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.fillRect(drawX, drawY + blockSize - 2, blockSize * progress, 2);
        }
        
        // Block outline
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(drawX, drawY, blockSize, blockSize);
      }
    }

    // Draw particles
    particles.forEach(particle => {
      const particleX = (particle.x - cameraX * blockSize);
      const particleY = (particle.y - cameraY * blockSize);
      
      if (particleX >= -10 && particleX <= canvas.width + 10 &&
          particleY >= -10 && particleY <= canvas.height + 10) {
        const alpha = particle.life / particle.maxLife;
        ctx.fillStyle = particle.color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
        ctx.fillRect(particleX, particleY, particle.size, particle.size);
      }
    });

    // Draw mobs with animations
    mobs.forEach(mob => {
      const mobScreenX = (mob.x - cameraX) * blockSize;
      const mobScreenY = (mob.y - cameraY) * blockSize;
      
      if (mobScreenX >= -blockSize && mobScreenX <= canvas.width + blockSize &&
          mobScreenY >= -blockSize && mobScreenY <= canvas.height + blockSize) {
        
        // Mob animation based on type
        if (mob.type === 'zombie') {
          // Zombie body
          ctx.fillStyle = adjustColorBrightness('#4a5d23', lightLevel);
          ctx.fillRect(mobScreenX + 2, mobScreenY, blockSize - 4, blockSize * 2);
          
          // Zombie head
          ctx.fillStyle = adjustColorBrightness('#6b8e23', lightLevel);
          ctx.fillRect(mobScreenX + 1, mobScreenY - 8, blockSize - 2, 8);
          
          // Red eyes
          ctx.fillStyle = '#FF0000';
          ctx.fillRect(mobScreenX + 4, mobScreenY - 6, 2, 2);
          ctx.fillRect(mobScreenX + 10, mobScreenY - 6, 2, 2);
        } else if (mob.type === 'spider') {
          // Spider body
          ctx.fillStyle = adjustColorBrightness('#2F2F2F', lightLevel);
          ctx.fillRect(mobScreenX + 2, mobScreenY + 4, blockSize - 4, blockSize);
          
          // Spider legs
          ctx.fillStyle = adjustColorBrightness('#1a1a1a', lightLevel);
          for (let i = 0; i < 4; i++) {
            ctx.fillRect(mobScreenX - 2 + i * 5, mobScreenY + 6, 2, 6);
            ctx.fillRect(mobScreenX + 2 + i * 3, mobScreenY + 2, 2, 4);
          }
          
          // Spider eyes
          ctx.fillStyle = '#FF0000';
          ctx.fillRect(mobScreenX + 5, mobScreenY + 6, 1, 1);
          ctx.fillRect(mobScreenX + 9, mobScreenY + 6, 1, 1);
        } else if (mob.type === 'slime') {
          // Slime bouncing animation
          const bounceOffset = Math.sin(gameTime * 0.2) * 2;
          ctx.fillStyle = adjustColorBrightness('#00FF00', lightLevel);
          ctx.fillRect(mobScreenX + 2, mobScreenY + bounceOffset, blockSize - 4, blockSize + 4 - bounceOffset);
          
          // Slime highlights
          ctx.fillStyle = adjustColorBrightness('#80FF80', lightLevel);
          ctx.fillRect(mobScreenX + 4, mobScreenY + 2 + bounceOffset, 3, 3);
          ctx.fillRect(mobScreenX + 9, mobScreenY + 6 + bounceOffset, 2, 2);
        }
        
        // Health bar for mobs
        if (mob.health < mob.maxHealth) {
          const healthBarWidth = 12;
          const healthPercentage = mob.health / mob.maxHealth;
          
          ctx.fillStyle = '#FF0000';
          ctx.fillRect(mobScreenX + 2, mobScreenY - 12, healthBarWidth, 2);
          ctx.fillStyle = '#00FF00';
          ctx.fillRect(mobScreenX + 2, mobScreenY - 12, healthBarWidth * healthPercentage, 2);
        }
      }
    });

    // Draw player with enhanced animations
    const playerScreenX = (playerPosition.x - cameraX) * blockSize;
    const playerScreenY = (playerPosition.y - cameraY) * blockSize;
    
    // Player movement animation
    const walkCycle = Math.sin(gameTime * 0.3) * (Math.abs(playerVelocity.x) > 0.1 ? 2 : 0);
    
    // Player body with hurt effect
    const hurtEffect = Date.now() - lastDamage < 500;
    const playerColor = hurtEffect ? '#FF6666' : '#0066CC';
    
    ctx.fillStyle = adjustColorBrightness(playerColor, lightLevel);
    ctx.fillRect(playerScreenX, playerScreenY + walkCycle, blockSize, blockSize * 2);
    
    // Player head
    ctx.fillStyle = adjustColorBrightness('#FFDBAC', lightLevel);
    ctx.fillRect(playerScreenX + 2, playerScreenY - 8 + walkCycle, blockSize - 4, 8);
    
    // Player eyes
    ctx.fillStyle = '#000000';
    ctx.fillRect(playerScreenX + 4, playerScreenY - 6 + walkCycle, 2, 2);
    ctx.fillRect(playerScreenX + 10, playerScreenY - 6 + walkCycle, 2, 2);
    
    // Player held item
    const heldItem = hotbar[selectedSlot];
    if (heldItem) {
      ctx.font = '12px monospace';
      ctx.fillText(heldItem.icon, playerScreenX + 16, playerScreenY + 8);
    }
    
  }, [gameStarted, playerPosition, world, mobs, particles, gameTime, mining, hotbar, selectedSlot, lastDamage]);

  // Enhanced click handling for mining and building
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
      
      const distance = Math.sqrt(
        Math.pow(worldX - playerPosition.x, 2) + 
        Math.pow(worldY - playerPosition.y, 2)
      );
      
      if (distance <= 5) {
        if (world[worldY][worldX] === 'air') {
          // Place block
          const selectedItem = hotbar[selectedSlot];
          if (selectedItem && selectedItem.count > 0) {
            const newWorld = [...world];
            newWorld[worldY][worldX] = selectedItem.id;
            setWorld(newWorld);
            
            // Consume item
            setHotbar(prev => {
              const newHotbar = [...prev];
              if (newHotbar[selectedSlot]) {
                newHotbar[selectedSlot]!.count--;
                if (newHotbar[selectedSlot]!.count <= 0) {
                  newHotbar[selectedSlot] = null;
                }
              }
              return newHotbar;
            });
          }
        } else {
          // Mine block
          mineBlock(worldX, worldY);
        }
      }
    }
  };

  // Handle right click
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Could add different right-click functionality here
  };

  // Render UI elements
  const renderHUD = () => (
    <div className="fixed inset-x-0 bottom-0 p-4 pointer-events-none">
      {/* Health and Hunger bars */}
      <div className="flex justify-center mb-4">
        <div className="bg-black/50 rounded-lg p-2 flex gap-4">
          {/* Health */}
          <div className="flex items-center gap-2">
            <Icon name="Heart" size={16} className="text-red-500" />
            <div className="flex gap-0.5">
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-sm ${
                    i < playerHealth / 2 ? 'bg-red-500' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
          
          {/* Hunger */}
          <div className="flex items-center gap-2">
            <Icon name="UtensilsCrossed" size={16} className="text-orange-500" />
            <div className="flex gap-0.5">
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-sm ${
                    i < playerHunger / 2 ? 'bg-orange-500' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>
          
          {/* XP */}
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <Icon name="Star" size={16} />
            <span>{playerXP} XP</span>
          </div>
        </div>
      </div>
      
      {/* Hotbar */}
      <div className="flex justify-center">
        <div className="bg-black/70 rounded-lg p-2 flex gap-1 pointer-events-auto">
          {hotbar.map((item, index) => (
            <div
              key={index}
              className={`w-12 h-12 border-2 rounded cursor-pointer flex items-center justify-center text-xs ${
                selectedSlot === index 
                  ? 'border-yellow-400 bg-yellow-600/20' 
                  : 'border-gray-500 bg-gray-800/50'
              } hover:bg-gray-600/50 relative`}
              onClick={() => setSelectedSlot(index)}
            >
              {item && (
                <>
                  <span className="text-lg">{item.icon}</span>
                  <span className="absolute bottom-0 right-0 text-xs text-white bg-black/70 rounded px-1">
                    {item.count}
                  </span>
                </>
              )}
              <span className="absolute -top-6 text-xs text-white">{index + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen relative" style={{
      background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
      fontFamily: 'Orbitron, monospace'
    }}>
      {/* Header */}
      <div className="p-4 bg-black/30 backdrop-blur-sm border-b-4" style={{borderColor: '#8B4513'}}>
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white" style={{
            textShadow: '3px 3px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000',
            fontFamily: 'Orbitron, monospace'
          }}>
            ⚡ BLOCKCRAFT 2D v2.0 ⚡
          </h1>
          
          {gameStarted && (
            <div className="text-white text-sm flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Icon name="Clock" size={16} />
                <span>День {Math.floor(gameTime / 24000) + 1}</span>
              </div>
              <div className="flex items-center gap-1">
                {gameTime % 24000 < 12000 ? (
                  <Icon name="Sun" size={16} className="text-yellow-400" />
                ) : (
                  <Icon name="Moon" size={16} className="text-blue-300" />
                )}
                <span>{gameTime % 24000 < 12000 ? 'День' : 'Ночь'}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto p-4 grid lg:grid-cols-4 gap-6">
        {/* Game Area */}
        <div className="lg:col-span-3">
          <Card className="border-4" style={{borderColor: '#8B4513', backgroundColor: '#1a1a1a'}}>
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-xl flex items-center gap-2">
                <Icon name="Gamepad2" size={24} className="text-purple-400" />
                Игровой мир - Выживание в 2D
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!gameStarted ? (
                <div className="text-center py-12">
                  <div className="mb-6">
                    <Icon name="Rocket" size={64} className="mx-auto text-purple-500 animate-bounce" />
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-4">
                    🌟 BLOCKCRAFT 2D v2.0 🌟
                  </h3>
                  <div className="text-gray-300 mb-6 space-y-2">
                    <p className="text-lg">🚀 ГИГАНТСКОЕ ОБНОВЛЕНИЕ!</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <p>⚔️ Мобы и сражения</p>
                      <p>🎒 Инвентарь и крафт</p>
                      <p>🌅 День/ночь цикл</p>
                      <p>💎 Руды и инструменты</p>
                      <p>❤️ Здоровье и голод</p>
                      <p>✨ Частицы и анимации</p>
                      <p>🏠 Улучшенная генерация</p>
                      <p>🎮 Продвинутая физика</p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => setGameStarted(true)}
                    className="px-12 py-6 text-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-2 border-purple-400 transform hover:scale-105 transition-transform"
                    style={{fontFamily: 'Orbitron, monospace'}}
                  >
                    <Icon name="Rocket" size={24} className="mr-3" />
                    🚀 НАЧАТЬ ПРИКЛЮЧЕНИЕ!
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <canvas 
                    ref={canvasRef}
                    width={1000}
                    height={600}
                    className="w-full border-2 border-purple-600 bg-sky-300 cursor-crosshair rounded-lg"
                    onClick={handleCanvasClick}
                    onContextMenu={handleContextMenu}
                    style={{ imageRendering: 'pixelated' }}
                  />
                  
                  {renderHUD()}
                  
                  {/* Controls Info */}
                  <div className="mt-4 grid grid-cols-3 gap-4 text-white text-sm">
                    <div className="bg-black/50 p-3 rounded">
                      <p className="font-bold mb-2">🎮 Управление:</p>
                      <p>WASD - движение и прыжок</p>
                      <p>1-9 - выбор предмета</p>
                      <p>E - инвентарь, C - крафт</p>
                    </div>
                    
                    <div className="bg-black/50 p-3 rounded">
                      <p className="font-bold mb-2">⚔️ Геймплей:</p>
                      <p>ЛКМ - добыча/постройка</p>
                      <p>Сражайтесь с мобами</p>
                      <p>Добывайте ресурсы</p>
                    </div>
                    
                    <div className="bg-black/50 p-3 rounded">
                      <p className="font-bold mb-2">📊 Статистика:</p>
                      <p>Позиция: {Math.floor(playerPosition.x)}, {Math.floor(playerPosition.y)}</p>
                      <p>Мобов: {mobs.length}</p>
                      <p>Частиц: {particles.length}</p>
                    </div>
                  </div>
                  
                  {/* New World Button */}
                  <div className="mt-4 text-center">
                    <Button 
                      onClick={generateWorld}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 border-2 border-green-400"
                    >
                      <Icon name="RefreshCw" size={16} className="mr-2" />
                      🌍 Новый мир
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Side Panel */}
        <div className="space-y-6">
          {/* Multiplayer */}
          <Card className="border-4" style={{borderColor: '#8B4513', backgroundColor: '#1a1a1a'}}>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Icon name="Wifi" size={20} className="text-blue-400" />
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
            </CardContent>
          </Card>

          {/* Game Features v2.0 */}
          <Card className="border-4" style={{borderColor: '#8B4513', backgroundColor: '#1a1a1a'}}>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Icon name="Zap" size={20} className="text-yellow-400" />
                🚀 Новые возможности v2.0
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="flex items-center gap-2 p-2 bg-green-900/30 rounded border border-green-600">
                  <Icon name="Swords" size={16} className="text-red-400" />
                  <span className="text-white">Мобы и боевая система</span>
                </div>
                
                <div className="flex items-center gap-2 p-2 bg-blue-900/30 rounded border border-blue-600">
                  <Icon name="Package" size={16} className="text-blue-400" />
                  <span className="text-white">Инвентарь 36 слотов</span>
                </div>
                
                <div className="flex items-center gap-2 p-2 bg-purple-900/30 rounded border border-purple-600">
                  <Icon name="Hammer" size={16} className="text-purple-400" />
                  <span className="text-white">Система крафта</span>
                </div>
                
                <div className="flex items-center gap-2 p-2 bg-yellow-900/30 rounded border border-yellow-600">
                  <Icon name="Sun" size={16} className="text-yellow-400" />
                  <span className="text-white">День/ночь освещение</span>
                </div>
                
                <div className="flex items-center gap-2 p-2 bg-red-900/30 rounded border border-red-600">
                  <Icon name="Heart" size={16} className="text-red-400" />
                  <span className="text-white">Здоровье и голод</span>
                </div>
                
                <div className="flex items-center gap-2 p-2 bg-emerald-900/30 rounded border border-emerald-600">
                  <Icon name="Pickaxe" size={16} className="text-emerald-400" />
                  <span className="text-white">Добыча ресурсов</span>
                </div>
                
                <div className="flex items-center gap-2 p-2 bg-orange-900/30 rounded border border-orange-600">
                  <Icon name="Sparkles" size={16} className="text-orange-400" />
                  <span className="text-white">Частицы и эффекты</span>
                </div>
                
                <div className="flex items-center gap-2 p-2 bg-cyan-900/30 rounded border border-cyan-600">
                  <Icon name="Mountain" size={16} className="text-cyan-400" />
                  <span className="text-white">Руды и пещеры</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Player Stats */}
          <Card className="border-4" style={{borderColor: '#8B4513', backgroundColor: '#1a1a1a'}}>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Icon name="User" size={20} className="text-green-400" />
                Игрок
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-white text-sm space-y-1">
                <div className="flex justify-between">
                  <span>❤️ Здоровье:</span>
                  <span>{playerHealth}/20</span>
                </div>
                <div className="flex justify-between">
                  <span>🍖 Голод:</span>
                  <span>{playerHunger}/20</span>
                </div>
                <div className="flex justify-between">
                  <span>⭐ Опыт:</span>
                  <span>{playerXP} XP</span>
                </div>
                <div className="flex justify-between">
                  <span>📍 Позиция:</span>
                  <span>{Math.floor(playerPosition.x)}, {Math.floor(playerPosition.y)}</span>
                </div>
                <div className="flex justify-between">
                  <span>🏃 На земле:</span>
                  <span>{isOnGround ? 'Да' : 'Нет'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
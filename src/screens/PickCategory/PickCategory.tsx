import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { apiService, Category } from "../../services/api";

interface PickCategoryProps {
  onSelectCategory: (category: { name: string; image: string; contractTheme?: string }) => void;
  onBack: () => void;
}

interface CardPosition {
  baseAngle: number;
  x: number;
  y: number;
  rotation: number;
  zIndex: number;
}

export const PickCategory = ({ onSelectCategory, onBack }: PickCategoryProps): JSX.Element => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories from backend API (which reads from backend/src/data/categories.ts)
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch categories from backend API endpoint: /api/game/categories
        // This endpoint returns data from backend/src/data/categories.ts
        const response = await apiService.getCategories();
        
        if (response.success && response.categories) {
          console.log('Categories fetched from backend:', response.categories.length, 'categories');
          
          // Repeat categories to fill the circle (20 cards)
          const baseCategories = response.categories;
          const totalCardsOnCircle = 20;
          const repeatedCategories = Array.from({ length: totalCardsOnCircle }, (_, i) => 
            baseCategories[i % baseCategories.length]
          );
          setCategories(repeatedCategories);
        } else {
          throw new Error('Invalid response from backend');
        }
      } catch (err: any) {
        setError(err.message || "Failed to load categories from backend");
        console.error('Error fetching categories from backend:', err);
        // Set empty categories on error - user will see error message
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Precompute initial positions so cards render directly on the circle
  const computeInitialPositions = (total: number, r: number): CardPosition[] => {
    const angleStep = 360 / total;
    const positions: CardPosition[] = [];
    for (let index = 0; index < total; index++) {
      const baseAngle = index * angleStep;
      const zIndex = index + 1;
      const rad = (baseAngle * Math.PI) / 180;
      const x = Math.sin(rad) * r;
      const y = -Math.cos(rad) * r;
      const rotation = baseAngle;
      positions.push({ baseAngle, x, y, rotation, zIndex });
    }
    return positions;
  };

  const [cardPositions, setCardPositions] = useState<CardPosition[]>([]);
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);
  const [autoRotation, setAutoRotation] = useState<number>(0);
  const [isRotationPaused, setIsRotationPaused] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const radius = 800; // Circle radius adjusted for viewport centering

  // Initialize card positions when categories are loaded
  useEffect(() => {
    if (categories.length > 0) {
      setCardPositions(computeInitialPositions(categories.length, radius));
    }
  }, [categories.length, radius]);

  // Auto-rotate cards continuously (only when not paused)
  useEffect(() => {
    if (isRotationPaused || categories.length === 0) return;

    let animationFrameId: number;
    let lastTime = Date.now();
    const rotationSpeed = 0.1; // degrees per frame

    const animate = () => {
      if (isRotationPaused) return;
      
      const currentTime = Date.now();
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      setAutoRotation((prev) => prev + rotationSpeed * (deltaTime / 16.67)); // Normalize to 60fps

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isRotationPaused, categories.length]);

  const handleMouseDown = () => {
    setIsMouseDown(true);
    setIsRotationPaused(true);
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
    setIsRotationPaused(false);
  };

  const handleCardClick = (e: React.MouseEvent, category: Category) => {
    e.stopPropagation();
    onSelectCategory({
      name: category.displayName || category.name,
      image: category.image,
      contractTheme: category.contractTheme, // Pass contract theme for backend
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current || !isMouseDown) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;
    
    const mouseX = e.clientX - containerRect.left - centerX;
    const mouseY = e.clientY - containerRect.top - centerY;
    
    // Calculate mouse angle from center (in degrees)
    const mouseAngle = Math.atan2(mouseY, mouseX) * (180 / Math.PI);

    // Rotate all cards around the circle following mouse
    setCardPositions((prev) =>
      prev.map((pos) => {
        // Add mouse rotation offset to base angle
        const currentAngle = pos.baseAngle + mouseAngle * 0.5 + autoRotation; // Include auto rotation
        const rad = (currentAngle * Math.PI) / 180;
        
        // Calculate new position on circle (follows circular path)
        const x = Math.sin(rad) * radius;
        const y = -Math.cos(rad) * radius; // Full circle, no scaling
        
        // Card rotation points outward (tangent to circle)
        const rotation = currentAngle;
        
        return {
          ...pos,
          x,
          y,
          rotation,
        };
      })
    );
  };

  // Update card positions with auto rotation
  useEffect(() => {
    if (categories.length === 0) return;
    
    setCardPositions((prev) =>
      prev.map((pos) => {
        const currentAngle = pos.baseAngle + autoRotation;
        const rad = (currentAngle * Math.PI) / 180;
        
        const x = Math.sin(rad) * radius;
        const y = -Math.cos(rad) * radius;
        const rotation = currentAngle;
        
        return {
          ...pos,
          x,
          y,
          rotation,
        };
      })
    );
  }, [autoRotation, radius, categories.length]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/80" onClick={onBack} />
        <div className="relative w-[90%] h-[320px] flex flex-col items-center justify-center bg-black">
          <p className="text-white text-xl">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80"
        onClick={onBack}
      />
      
      {/* Modal Content */}
      <div className="relative w-[90%] h-[320px] flex flex-col items-center justify-center overflow-hidden bg-black">
        <h1 className="text-white text-2xl mt-12">Pick a category:</h1>
        
        {error && (
          <p className="text-yellow-500 text-sm mt-2">
            {error} (Using fallback categories)
          </p>
        )}
        
        <main className="h-full w-full flex flex-col items-center gap-4 px-4 relative overflow-visible">
          <div
            ref={containerRef}
            className="relative w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
            style={{ padding: '920px' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {categories.map((category, index) => {
              const position = cardPositions[index] || { 
                baseAngle: 0, 
                x: 0, 
                y: 0, 
                rotation: 0, 
                zIndex: 0 
              };

              // Get image URL exactly as provided from backend
              const imageUrl = category.image || '';

              return (
                <Card
                  key={`${category.id}-${index}`}
                  onClick={(e) => handleCardClick(e, category)}
                  className="absolute w-[180px] h-[220px] border-2 border-solid border-[#e0e0e0] rounded-xl cursor-pointer hover:border-white select-none overflow-hidden"
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) rotate(${position.rotation}deg)`,
                    zIndex: position.zIndex,
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                    transformOrigin: 'center center',
                  }}
                >
                  {/* Fallback: Colored background (lowest layer) */}
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundColor: category.color || '#ffffff',
                      zIndex: 1,
                    }}
                  />
                  
                  {/* Background Image (above background color) */}
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt={category.displayName}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{
                        zIndex: 2,
                        display: 'block',
                      }}
                      onError={(e) => {
                        // If image fails to load, hide the img element
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                      loading="lazy"
                    />
                  )}
                  
                  {/* Gradient Overlay (above image) */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"
                    style={{
                      zIndex: 3,
                    }}
                  />
                  
                  {/* Content (highest layer) */}
                  <CardContent className="relative p-4 h-full flex flex-col items-end justify-end" style={{ zIndex: 4 }}>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl drop-shadow-lg">{category.icon}</span>
                      <span className="[font-family:'Kanit',Helvetica] font-medium text-[#f9f9f9] text-xl tracking-[0] leading-[normal] drop-shadow-lg">
                        {category.displayName}
                      </span>
                    </div>
                    {category.description && (
                      <p className="text-[#f9f9f9] text-xs mt-1 opacity-90 drop-shadow-md">
                        {category.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>        
        </main>
      </div>
    </div>
  );
};

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { AppSidebar } from "./AppSidebar";

export enum CellState {
  FREE = "free",
  REFERENCED = "referenced", 
  DEREFERENCED = "dereferenced",
  MARKED = "marked",
  SURVIVED = "survived",
  COPYING = "copying"
}

export interface MemoryCell {
  state: CellState;
  survivedCycles: number;
  id: number;
  space: 'eden' | 'survivor-from' | 'survivor-to' | 'tenured';
}

export const GenerationalGCSimulator = () => {
  const [heap, setHeap] = useState<MemoryCell[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [gcCycles, setGcCycles] = useState(0);
  const [phase, setPhase] = useState<'allocating' | 'marking' | 'copying-survivor' | 'copying-tenured' | 'swapping' | 'complete'>('allocating');
  const [gridSize, setGridSize] = useState(15);
  const [speed, setSpeed] = useState(600);
  const [activeSurvivorSpace, setActiveSurvivorSpace] = useState<'survivor-from' | 'survivor-to'>('survivor-from');
  const [edenSize, setEdenSize] = useState(0.4); // 40% of total space
  const [tenureThreshold, setTenureThreshold] = useState(3); // cycles to move to tenured

  // Initialize heap with four spaces
  useEffect(() => {
    initializeHeap();
  }, []);

  const initializeHeap = () => {
    const totalCells = gridSize * gridSize;
    const newHeap: MemoryCell[] = [];
    
    // Calculate cells per zone (vertical distribution)
    const edenCols = Math.floor(gridSize * edenSize);
    const survivorCols = Math.floor((gridSize - edenCols) * 0.5); // Half of remaining
    const tenuredCols = gridSize - edenCols - (survivorCols * 2);
    
    // Create zones column by column (vertical separation)
    for (let row = 0; row < gridSize; row++) {
      let col = 0;
      
      // Eden Space (leftmost columns)
      for (let edenCol = 0; edenCol < edenCols; edenCol++) {
        const cellId = row * gridSize + col++;
        newHeap.push({
          state: CellState.FREE,
          survivedCycles: 0,
          id: cellId,
          space: 'eden'
        });
      }
      
      // Survivor From Space
      for (let survivorCol = 0; survivorCol < survivorCols; survivorCol++) {
        const cellId = row * gridSize + col++;
        newHeap.push({
          state: CellState.FREE,
          survivedCycles: 0,
          id: cellId,
          space: 'survivor-from'
        });
      }
      
      // Survivor To Space
      for (let survivorCol = 0; survivorCol < survivorCols; survivorCol++) {
        const cellId = row * gridSize + col++;
        newHeap.push({
          state: CellState.FREE,
          survivedCycles: 0,
          id: cellId,
          space: 'survivor-to'
        });
      }
      
      // Tenured Space (rightmost columns)
      for (let tenuredCol = 0; tenuredCol < tenuredCols; tenuredCol++) {
        const cellId = row * gridSize + col++;
        newHeap.push({
          state: CellState.FREE,
          survivedCycles: 0,
          id: cellId,
          space: 'tenured'
        });
      }
    }
    
    // Sort by ID to maintain grid order
    newHeap.sort((a, b) => a.id - b.id);
    
    setHeap(newHeap);
    setCurrentStep(0);
    setGcCycles(0);
    setPhase('allocating');
    setActiveSurvivorSpace('survivor-from');
  };

  const simulateAllocation = () => {
    setHeap(prev => {
      const newHeap = [...prev];
      const edenCells = newHeap.filter(cell => 
        cell.space === 'eden' && cell.state === CellState.FREE
      );
      
      if (edenCells.length === 0) return newHeap;

      // Allocate 4-6 new objects in Eden space
      const allocateCount = Math.min(Math.floor(Math.random() * 3) + 4, edenCells.length);
      for (let i = 0; i < allocateCount; i++) {
        const cellToAllocate = edenCells[i];
        if (cellToAllocate) {
          newHeap[cellToAllocate.id].state = CellState.REFERENCED;
        }
      }

      // Randomly dereference many objects in Eden (high mortality rate)
      const referencedCells = newHeap.filter(cell => 
        cell.space === 'eden' && cell.state === CellState.REFERENCED
      );
      const dereferenceCount = Math.floor(Math.random() * 4) + 2; // More aggressive dereferencing
      for (let i = 0; i < Math.min(dereferenceCount, referencedCells.length); i++) {
        const randomIndex = Math.floor(Math.random() * referencedCells.length);
        const cellToDereference = referencedCells.splice(randomIndex, 1)[0];
        if (cellToDereference) {
          newHeap[cellToDereference.id].state = CellState.DEREFERENCED;
        }
      }

      return newHeap;
    });
  };

  const simulateMarkPhase = () => {
    setHeap(prev => {
      const newHeap = [...prev];
      newHeap.forEach(cell => {
        if (cell.state === CellState.REFERENCED || cell.survivedCycles > 0) {
          cell.state = CellState.MARKED;
        }
      });
      return newHeap;
    });
  };

  const simulateCopyToSurvivor = () => {
    setHeap(prev => {
      const newHeap = [...prev];
      const markedEdenCells = newHeap.filter(cell => 
        cell.space === 'eden' && cell.state === CellState.MARKED
      );
      
      const inactiveSurvivorSpace = activeSurvivorSpace === 'survivor-from' ? 'survivor-to' : 'survivor-from';
      const availableSurvivorCells = newHeap.filter(cell => 
        cell.space === inactiveSurvivorSpace && cell.state === CellState.FREE
      );

      let survivorIndex = 0;
      markedEdenCells.forEach(markedCell => {
        if (survivorIndex < availableSurvivorCells.length) {
          const targetCell = availableSurvivorCells[survivorIndex++];
          newHeap[targetCell.id] = {
            state: CellState.COPYING,
            survivedCycles: markedCell.survivedCycles + 1,
            id: targetCell.id,
            space: inactiveSurvivorSpace
          };
        }
      });

      // Clear Eden space
      newHeap.forEach(cell => {
        if (cell.space === 'eden') {
          cell.state = CellState.FREE;
          cell.survivedCycles = 0;
        }
      });

      return newHeap;
    });
  };

  const simulateCopyBetweenSurvivors = () => {
    setHeap(prev => {
      const newHeap = [...prev];
      const activeSurvivor = newHeap.filter(cell => 
        cell.space === activeSurvivorSpace && cell.state === CellState.MARKED
      );
      
      const inactiveSurvivorSpace = activeSurvivorSpace === 'survivor-from' ? 'survivor-to' : 'survivor-from';
      const availableCells = newHeap.filter(cell => 
        cell.space === inactiveSurvivorSpace && cell.state === CellState.FREE
      );
      
      const tenuredCells = newHeap.filter(cell => 
        cell.space === 'tenured' && cell.state === CellState.FREE
      );

      let survivorIndex = 0;
      let tenuredIndex = 0;

      activeSurvivor.forEach(markedCell => {
        if (markedCell.survivedCycles >= tenureThreshold && tenuredIndex < tenuredCells.length) {
          // Move to tenured space
          const targetCell = tenuredCells[tenuredIndex++];
          newHeap[targetCell.id] = {
            state: CellState.COPYING,
            survivedCycles: markedCell.survivedCycles + 1,
            id: targetCell.id,
            space: 'tenured'
          };
        } else if (survivorIndex < availableCells.length) {
          // Move to other survivor space
          const targetCell = availableCells[survivorIndex++];
          newHeap[targetCell.id] = {
            state: CellState.COPYING,
            survivedCycles: markedCell.survivedCycles + 1,
            id: targetCell.id,
            space: inactiveSurvivorSpace
          };
        }
      });

      // Clear active survivor space
      newHeap.forEach(cell => {
        if (cell.space === activeSurvivorSpace) {
          cell.state = CellState.FREE;
          cell.survivedCycles = 0;
        }
      });

      return newHeap;
    });
  };

  const finalizeCopyPhase = () => {
    setHeap(prev => {
      const newHeap = [...prev];
      newHeap.forEach(cell => {
        if (cell.state === CellState.COPYING) {
          cell.state = CellState.SURVIVED;
        }
      });
      return newHeap;
    });
  };

  const nextStep = () => {
    if (phase === 'complete') return;

    setCurrentStep(prev => prev + 1);

    if (phase === 'allocating') {
      const activeSpaceFull = heap.filter(cell => 
        cell.space === 'eden' && cell.state === CellState.FREE
      ).length < 3;

      if (activeSpaceFull) {
        setPhase('marking');
        setGcCycles(prev => prev + 1);
        toast.info(`Iniciando ciclo GC #${gcCycles + 1} - Fase de marcado`);
      } else {
        simulateAllocation();
      }
    } else if (phase === 'marking') {
      simulateMarkPhase();
      // Add pause after marking to appreciate marked cells
      setTimeout(() => {
        setPhase('copying-survivor');
        toast.info("Copiando objetos vivos de Eden a Survivor");
      }, 1500);
    } else if (phase === 'copying-survivor') {
      simulateCopyToSurvivor();
      setTimeout(() => {
        setPhase('copying-tenured');
        toast.info("Procesando objetos en Survivor");
      }, 800);
    } else if (phase === 'copying-tenured') {
      simulateCopyBetweenSurvivors();
      setTimeout(() => {
        setPhase('swapping');
        toast.info("Finalizando copia y cambiando espacios");
      }, 800);
    } else if (phase === 'swapping') {
      finalizeCopyPhase();
      setActiveSurvivorSpace(prev => prev === 'survivor-from' ? 'survivor-to' : 'survivor-from');
      setPhase('allocating');
      toast.success(`Ciclo GC #${gcCycles} completado`);
    }
  };

  const toggleSimulation = () => {
    setIsRunning(!isRunning);
  };

  const reset = () => {
    setIsRunning(false);
    initializeHeap();
    toast.info("Simulación reiniciada");
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(nextStep, speed);
    }
    return () => clearInterval(interval);
  }, [isRunning, phase, heap, speed]);

  const getCellColor = (cell: MemoryCell) => {
    const baseColors = {
      [CellState.FREE]: "bg-gray-100 dark:bg-gray-800",
      [CellState.REFERENCED]: "bg-blue-400 dark:bg-blue-600",
      [CellState.DEREFERENCED]: "bg-red-400 dark:bg-red-600", 
      [CellState.MARKED]: "bg-yellow-400 dark:bg-yellow-600",
      [CellState.SURVIVED]: "bg-green-400 dark:bg-green-600",
      [CellState.COPYING]: "bg-purple-400 dark:bg-purple-600"
    };

    // Space background colors for better visual separation
    let spaceBackground = "";
    let spaceBorder = "";
    
    if (cell.space === 'eden') {
      spaceBackground = cell.state === CellState.FREE ? "bg-yellow-50 dark:bg-yellow-900/20" : "";
      spaceBorder = "border-l-4 border-yellow-500";
    } else if (cell.space === 'survivor-from') {
      spaceBackground = cell.state === CellState.FREE ? "bg-orange-50 dark:bg-orange-900/20" : "";
      spaceBorder = activeSurvivorSpace === 'survivor-from' 
        ? "border-l-4 border-orange-500" 
        : "border-l-4 border-orange-300";
    } else if (cell.space === 'survivor-to') {
      spaceBackground = cell.state === CellState.FREE ? "bg-gray-50 dark:bg-gray-900/20" : "";
      spaceBorder = activeSurvivorSpace === 'survivor-to' 
        ? "border-l-4 border-gray-500" 
        : "border-l-4 border-gray-300";
    } else if (cell.space === 'tenured') {
      spaceBackground = cell.state === CellState.FREE ? "bg-blue-50 dark:bg-blue-900/20" : "";
      spaceBorder = "border-l-4 border-blue-500";
    }

    const finalColor = cell.state === CellState.FREE ? spaceBackground : baseColors[cell.state];
    return `${finalColor} ${spaceBorder}`;
  };

  const getSpaceLabel = (index: number) => {
    const cell = heap[index];
    if (!cell) return "";
    
    const edenCols = Math.floor(gridSize * edenSize);
    const survivorCols = Math.floor((gridSize - edenCols) * 0.5);
    
    // Labels appear at the top of each zone (first row)
    if (index === 0) return "Eden Space";
    if (index === edenCols) return "Survivor From";
    if (index === edenCols + survivorCols) return "Survivor To";
    if (index === edenCols + (survivorCols * 2)) return "Tenured Space";
    return "";
  };

  return (
    <div className="flex min-h-screen w-full">
      <AppSidebar 
        gridSize={gridSize}
        setGridSize={setGridSize}
        speed={speed}
        setSpeed={setSpeed}
        isRunning={isRunning}
        onToggleSimulation={toggleSimulation}
        onNextStep={nextStep}
        onReset={reset}
        currentStep={currentStep}
        gcCycles={gcCycles}
        phase={phase}
        edenSize={edenSize}
        setEdenSize={setEdenSize}
        tenureThreshold={tenureThreshold}
        setTenureThreshold={setTenureThreshold}
        collectorType="generational"
      />
      
      <main className="flex-1 p-6">
        <div className="flex items-center gap-2 mb-6">
          <SidebarTrigger />
          <h1 className="text-2xl font-bold">Generational Garbage Collector</h1>
        </div>
        
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-center">
              Memoria del Heap - Generational GC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mx-auto w-fit p-4 bg-muted/10 rounded-lg">
              {/* Zone Labels */}
              <div 
                className="grid gap-1 mb-2"
                style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
              >
                {Array.from({ length: gridSize }, (_, index) => {
                  const label = getSpaceLabel(index);
                  return (
                    <div key={index} className="text-center">
                      {label && (
                        <div className="text-xs font-bold text-foreground py-1 px-2 rounded bg-muted/50">
                          {label}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Memory Grid */}
              <div 
                className="grid gap-0.5 border-2 border-muted rounded-lg overflow-hidden"
                style={{ 
                  gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                  maxWidth: '90vw',
                  aspectRatio: '1'
                }}
              >
                {heap.map((cell) => (
                  <div
                    key={cell.id}
                    className={`
                      aspect-square transition-all duration-300 flex items-center justify-center text-xs font-semibold
                      ${getCellColor(cell)}
                      hover:scale-105 cursor-pointer border-r border-muted/30 last:border-r-0
                    `}
                    style={{
                      minWidth: `${Math.max(20, 600/gridSize)}px`,
                      minHeight: `${Math.max(20, 600/gridSize)}px`
                    }}
                    title={`Celda ${cell.id}: ${cell.state} (Ciclos: ${cell.survivedCycles}) - ${cell.space}`}
                  >
                    {cell.survivedCycles > 0 ? cell.survivedCycles : ''}
                  </div>
                ))}
              </div>
              
              {/* Legend */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded-sm"></div>
                  <span>Eden Space</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-500 rounded-sm"></div>
                  <span>Survivor From</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-50 dark:bg-gray-900/20 border-l-4 border-gray-500 rounded-sm"></div>
                  <span>Survivor To</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-sm"></div>
                  <span>Tenured Space</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};
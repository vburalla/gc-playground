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
    
    const edenCells = Math.floor(totalCells * edenSize);
    const survivorCells = Math.floor((totalCells - edenCells) * 0.2); // 20% each for survivor spaces
    const tenuredCells = totalCells - edenCells - (survivorCells * 2);
    
    let cellIndex = 0;
    
    // Create Eden Space (first area)
    for (let i = 0; i < edenCells; i++) {
      newHeap.push({
        state: CellState.FREE,
        survivedCycles: 0,
        id: cellIndex++,
        space: 'eden'
      });
    }
    
    // Create Survivor From Space (second area)
    for (let i = 0; i < survivorCells; i++) {
      newHeap.push({
        state: CellState.FREE,
        survivedCycles: 0,
        id: cellIndex++,
        space: 'survivor-from'
      });
    }
    
    // Create Survivor To Space (third area)
    for (let i = 0; i < survivorCells; i++) {
      newHeap.push({
        state: CellState.FREE,
        survivedCycles: 0,
        id: cellIndex++,
        space: 'survivor-to'
      });
    }
    
    // Create Tenured Space (final area)
    for (let i = 0; i < tenuredCells; i++) {
      newHeap.push({
        state: CellState.FREE,
        survivedCycles: 0,
        id: cellIndex++,
        space: 'tenured'
      });
    }
    
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

    return baseColors[cell.state];
  };

  const getCellBorder = (cell: MemoryCell, index: number) => {
    const totalCells = gridSize * gridSize;
    const edenCells = Math.floor(totalCells * edenSize);
    const survivorCells = Math.floor((totalCells - edenCells) * 0.2);
    
    const edenEnd = edenCells - 1;
    const survivorFromEnd = edenCells + survivorCells - 1;
    const survivorToEnd = edenCells + (survivorCells * 2) - 1;
    
    let borderClasses = "";
    
    // Eden Space border (yellow)
    if (index <= edenEnd) {
      borderClasses += "border-yellow-500";
      if (index === edenEnd) borderClasses += " border-b-4";
      else borderClasses += " border-b";
    }
    // Survivor From border (orange)
    else if (index <= survivorFromEnd) {
      borderClasses += "border-orange-500";
      if (index === survivorFromEnd) borderClasses += " border-b-4";
      else borderClasses += " border-b";
    }
    // Survivor To border (cyan)
    else if (index <= survivorToEnd) {
      borderClasses += "border-cyan-500";
      if (index === survivorToEnd) borderClasses += " border-b-4";
      else borderClasses += " border-b";
    }
    // Tenured border (purple)
    else {
      borderClasses += "border-purple-500 border-b";
    }
    
    return borderClasses;
  };

  const getSpaceLabel = (index: number) => {
    const totalCells = gridSize * gridSize;
    const edenCells = Math.floor(totalCells * edenSize);
    const survivorCells = Math.floor((totalCells - edenCells) * 0.2);
    
    if (index === 0) return "Eden Space";
    if (index === edenCells) return "Survivor From";
    if (index === edenCells + survivorCells) return "Survivor To";
    if (index === edenCells + (survivorCells * 2)) return "Tenured Space";
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
            <div 
              className="grid gap-1 mx-auto w-fit p-4 bg-muted/20 rounded-lg"
              style={{ 
                gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                maxWidth: '90vw',
                aspectRatio: '1'
              }}
            >
              {heap.map((cell, index) => {
                const label = getSpaceLabel(index);
                const borderClasses = getCellBorder(cell, index);
                return (
                  <div key={cell.id} className="relative">
                    {label && (
                      <div className="absolute -top-6 left-0 text-xs font-semibold text-foreground whitespace-nowrap z-10 bg-background px-2 py-1 rounded border">
                        {label}
                      </div>
                    )}
                    <div
                      className={`
                        aspect-square rounded-sm transition-all duration-300 flex items-center justify-center text-xs font-semibold
                        ${getCellColor(cell)} ${borderClasses}
                        hover:scale-110 cursor-pointer
                      `}
                      style={{
                        minWidth: `${Math.max(20, 600/gridSize)}px`,
                        minHeight: `${Math.max(20, 600/gridSize)}px`
                      }}
                      title={`Celda ${cell.id}: ${cell.state} (Ciclos: ${cell.survivedCycles}) - ${cell.space}`}
                    >
                      {cell.survivedCycles > 0 ? cell.survivedCycles : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};
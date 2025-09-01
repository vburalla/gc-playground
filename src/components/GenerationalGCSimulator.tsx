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
  const [edenSize, setEdenSize] = useState(0.15); // Eden entre 10% y 20%
  const [tenureThreshold, setTenureThreshold] = useState(3); // cycles to move to tenured

  // Initialize heap with four spaces
  useEffect(() => {
    initializeHeap();
  }, []);

  const initializeHeap = () => {
    const totalCells = gridSize * gridSize;
    const newHeap: MemoryCell[] = [];
    
    // Calculate columns for each zone (vertical distribution)
    const edenCols = Math.floor(gridSize * Math.min(Math.max(edenSize, 0.1), 0.2));
    const tenuredCols = Math.floor(gridSize * 0.4); // 40% for tenured
    const survivorCols = gridSize - edenCols - tenuredCols;
    const survivorRows = Math.floor(gridSize / 2); // Half rows for each survivor space
    
    // Initialize all cells first
    for (let i = 0; i < totalCells; i++) {
      newHeap.push({
        state: CellState.FREE,
        survivedCycles: 0,
        id: i,
        space: 'eden' // default, will be reassigned
      });
    }
    
    // Assign spaces based on position
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const cellId = row * gridSize + col;
        
        if (col < edenCols) {
          // Eden Space (leftmost columns)
          newHeap[cellId].space = 'eden';
        } else if (col < edenCols + survivorCols) {
          // Survivor Space (middle columns)
          if (row < survivorRows) {
            newHeap[cellId].space = 'survivor-from'; // Top half
          } else {
            newHeap[cellId].space = 'survivor-to'; // Bottom half
          }
        } else {
          // Tenured Space (rightmost columns)
          newHeap[cellId].space = 'tenured';
        }
      }
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
      // Randomly dereference some objects in survivor and tenured spaces to show deallocation
      newHeap.forEach(cell => {
        if ((cell.space === 'survivor-from' || cell.space === 'survivor-to' || cell.space === 'tenured') && cell.state === CellState.SURVIVED) {
          if (Math.random() < 0.15) { // 15% chance of deallocation
            cell.state = CellState.DEREFERENCED;
            cell.survivedCycles = 0;
          }
        }
      });
      // Mark reachable/live objects
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
      
      const availableSurvivorCells = newHeap.filter(cell => 
        cell.space === activeSurvivorSpace && cell.state === CellState.FREE
      );

      let survivorIndex = 0;
      markedEdenCells.forEach(markedCell => {
        if (survivorIndex < availableSurvivorCells.length) {
          const targetCell = availableSurvivorCells[survivorIndex++];
          newHeap[targetCell.id] = {
            state: CellState.COPYING,
            survivedCycles: (markedCell.survivedCycles || 0) + 1,
            id: targetCell.id,
            space: activeSurvivorSpace
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
      const sourceSpace = activeSurvivorSpace === 'survivor-from' ? 'survivor-to' : 'survivor-from';
      const sourceMarked = newHeap.filter(cell => 
        cell.space === sourceSpace && cell.state === CellState.MARKED
      );
      
      const availableActiveCells = newHeap.filter(cell => 
        cell.space === activeSurvivorSpace && cell.state === CellState.FREE
      );
      
      const tenuredCells = newHeap.filter(cell => 
        cell.space === 'tenured' && cell.state === CellState.FREE
      );

      let activeIndex = 0;
      let tenuredIndex = 0;

      sourceMarked.forEach(markedCell => {
        const nextCycles = (markedCell.survivedCycles || 0) + 1;
        if (nextCycles >= tenureThreshold && tenuredIndex < tenuredCells.length) {
          // Move to tenured space, reset counter so it disappears
          const targetCell = tenuredCells[tenuredIndex++];
          newHeap[targetCell.id] = {
            state: CellState.COPYING,
            survivedCycles: 0,
            id: targetCell.id,
            space: 'tenured'
          };
        } else if (activeIndex < availableActiveCells.length) {
          // Move to active survivor space (append after Eden-moved)
          const targetCell = availableActiveCells[activeIndex++];
          newHeap[targetCell.id] = {
            state: CellState.COPYING,
            survivedCycles: nextCycles,
            id: targetCell.id,
            space: activeSurvivorSpace
          };
        }
      });

      // Mark the source (inactive) survivor space as deallocated to visualize cleaning
      newHeap.forEach(cell => {
        if (cell.space === sourceSpace) {
          cell.state = CellState.DEREFERENCED;
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
        } else if (cell.state === CellState.DEREFERENCED && (cell.space === 'survivor-from' || cell.space === 'survivor-to' || cell.space === 'tenured')) {
          // Clean deallocated positions each cycle
          cell.state = CellState.FREE;
        }
      });
      return newHeap;
    });
  };

  const nextStep = () => {
    if (phase === 'complete') return;

    setCurrentStep(prev => prev + 1);

    if (phase === 'allocating') {
      const edenHasSpace = heap.filter(cell => 
        cell.space === 'eden' && cell.state === CellState.FREE
      ).length >= 3;

      if (edenHasSpace) {
        simulateAllocation();
      } else {
        // Swap Survivor ACTIVE space BEFORE marking (requested behavior)
        setActiveSurvivorSpace(prev => (prev === 'survivor-from' ? 'survivor-to' : 'survivor-from'));
        setGcCycles(prev => prev + 1);
        toast.info(`Iniciando ciclo GC #${gcCycles + 1}: swap de Survivor y fase de marcado`);
        setPhase('marking');
      }
    } else if (phase === 'marking') {
      simulateMarkPhase();
      // Pause to visualize MARKED cells
      setTimeout(() => {
        setPhase('copying-survivor');
        toast.info("Copiando vivos de Eden → Survivor ACTIVO");
      }, 1500);
    } else if (phase === 'copying-survivor') {
      simulateCopyToSurvivor();
      setTimeout(() => {
        setPhase('copying-tenured');
        toast.info("Copiando vivos de Survivor INACTIVO → ACTIVO / Promociones");
      }, 800);
    } else if (phase === 'copying-tenured') {
      simulateCopyBetweenSurvivors();
      setTimeout(() => {
        setPhase('swapping');
        toast.info("Finalizando copia y limpieza");
      }, 800);
    } else if (phase === 'swapping') {
      finalizeCopyPhase();
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
      [CellState.FREE]: "bg-gc-free-cell",
      [CellState.REFERENCED]: "bg-gc-referenced-cell",
      [CellState.DEREFERENCED]: "bg-gc-dereferenced-cell", 
      [CellState.MARKED]: "bg-gc-marked-cell",
      [CellState.SURVIVED]: "bg-gc-survived-cell",
      [CellState.COPYING]: "bg-accent"
    };

    return baseColors[cell.state];
  };

  const getCellBorder = (cell: MemoryCell, index: number) => {
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    
    const edenCols = Math.floor(gridSize * Math.min(Math.max(edenSize, 0.1), 0.2));
    const tenuredCols = Math.floor(gridSize * 0.4);
    const survivorCols = gridSize - edenCols - tenuredCols;
    const survivorRows = Math.floor(gridSize / 2);
    
    let borderClasses = "border";
    
    // Eden Space borders
    if (cell.space === 'eden') {
      borderClasses += " border-primary";
      if (col === 0) borderClasses += " border-l-4"; // Left border of Eden
      if (col === edenCols - 1) borderClasses += " border-r-4"; // Right border of Eden
      if (row === 0) borderClasses += " border-t-4"; // Top border of Eden
      if (row === gridSize - 1) borderClasses += " border-b-4"; // Bottom border of Eden
    }
    // Survivor From borders
    else if (cell.space === 'survivor-from') {
      borderClasses += " border-accent";
      if (col === edenCols) borderClasses += " border-l-4"; // Left border of Survivor
      if (col === edenCols + survivorCols - 1) borderClasses += " border-r-4"; // Right border of Survivor
      if (row === 0) borderClasses += " border-t-4"; // Top border of Survivor area
      if (row === survivorRows - 1) borderClasses += " border-b-4"; // Divider between From/To
    }
    // Survivor To borders
    else if (cell.space === 'survivor-to') {
      borderClasses += " border-ring";
      if (col === edenCols) borderClasses += " border-l-4"; // Left border of Survivor
      if (col === edenCols + survivorCols - 1) borderClasses += " border-r-4"; // Right border of Survivor
      if (row === survivorRows) borderClasses += " border-t-4"; // Divider between From/To
      if (row === gridSize - 1) borderClasses += " border-b-4"; // Bottom border of Survivor area
    }
    // Tenured borders
    else if (cell.space === 'tenured') {
      borderClasses += " border-secondary";
      if (col === edenCols + survivorCols) borderClasses += " border-l-4"; // Left border of Tenured
      if (col === gridSize - 1) borderClasses += " border-r-4"; // Right border of Tenured
      if (row === 0) borderClasses += " border-t-4"; // Top border of Tenured
      if (row === gridSize - 1) borderClasses += " border-b-4"; // Bottom border of Tenured
    }
    
    return borderClasses;
  };

  const getSpaceLabel = (index: number) => {
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    
    const edenCols = Math.floor(gridSize * Math.min(Math.max(edenSize, 0.1), 0.2));
    const tenuredCols = Math.floor(gridSize * 0.4);
    const survivorCols = gridSize - edenCols - tenuredCols;
    const survivorRows = Math.floor(gridSize / 2);
    
    // Show labels at the top of each zone
    if (row === 0) {
      if (col === 0) return "Eden Space";
      if (col === edenCols) return "Survivor From";
      if (col === edenCols + survivorCols) return "Tenured Space";
    }
    // Show Survivor To label at the middle row
    if (row === survivorRows && col === edenCols) return "Survivor To";
    
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
              className="grid gap-0 mx-auto w-fit p-4 bg-muted/20 rounded-lg"
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
                      <div className="absolute -top-7 left-0 text-xs font-bold text-foreground whitespace-nowrap z-10 bg-background px-2 py-1 rounded shadow-sm border-2 border-current">
                        {label}
                      </div>
                    )}
                    <div
                      className={`
                        aspect-square transition-all duration-300 flex items-center justify-center text-xs font-semibold
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
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";
import { AppSidebar } from "./AppSidebar";
import { StopTheWorldIndicator } from "./StopTheWorldIndicator";

export enum CellState {
  FREE = "free",
  REFERENCED = "referenced", 
  DEREFERENCED = "dereferenced",
  MARKED = "marked",
  SURVIVED = "survived"
}

export interface MemoryCell {
  state: CellState;
  survivedCycles: number;
  id: number;
}

export const GCSimulator = () => {
  const [heap, setHeap] = useState<MemoryCell[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [gcCycles, setGcCycles] = useState(0);
  const [phase, setPhase] = useState<'allocating' | 'marking' | 'sweeping' | 'complete'>('allocating');
  const [gridSize, setGridSize] = useState(15);
  const [speed, setSpeed] = useState(600); // milliseconds

  // Initialize heap
  useEffect(() => {
    initializeHeap();
  }, []);

  const initializeHeap = () => {
    const totalCells = gridSize * gridSize;
    const newHeap: MemoryCell[] = [];
    for (let i = 0; i < totalCells; i++) {
      newHeap.push({
        state: CellState.FREE,
        survivedCycles: 0,
        id: i
      });
    }
    setHeap(newHeap);
    setCurrentStep(0);
    setGcCycles(0);
    setPhase('allocating');
  };

  const simulateAllocation = () => {
    setHeap(prev => {
      const newHeap = [...prev];
      const freeCells = newHeap.filter(cell => cell.state === CellState.FREE);
      
      if (freeCells.length === 0) return newHeap;

      // Allocate 3-5 new objects sequentially (top to bottom, left to right)
      const allocateCount = Math.min(Math.floor(Math.random() * 3) + 3, freeCells.length);
      for (let i = 0; i < allocateCount; i++) {
        const cellToAllocate = freeCells[i]; // Take first available cell instead of random
        if (cellToAllocate) {
          newHeap[cellToAllocate.id].state = CellState.REFERENCED;
        }
      }

      // Randomly dereference some existing objects
      const referencedCells = newHeap.filter(cell => cell.state === CellState.REFERENCED);
      const dereferenceCount = Math.floor(Math.random() * 3) + 1;
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
    setPhase('marking');
    toast("Marcando objetos en uso...");
    
    // Pause for 1.5s to show marked cells
    setTimeout(() => {
      if (isRunning) {
        simulateSweepPhase();
        setCurrentStep(prev => prev + 1);
      }
    }, 1500);
  };

  const simulateSweepPhase = () => {
    setHeap(prev => {
      const newHeap = [...prev];
      newHeap.forEach(cell => {
        if (cell.state === CellState.DEREFERENCED) {
          // Free dereferenced cells
          cell.state = CellState.FREE;
          cell.survivedCycles = 0;
        } else if (cell.state === CellState.MARKED) {
          // Unmark and increment survival count
          cell.state = CellState.SURVIVED;
          cell.survivedCycles++;
        }
      });
      return newHeap;
    });
    setPhase('sweeping');
    toast("Liberando memoria no utilizada...");
  };

  const checkIfHeapFull = () => {
    const freeCells = heap.filter(cell => cell.state === CellState.FREE);
    return freeCells.length < 10; // Consider full when less than 10 free cells
  };

  const nextStep = () => {
    if (phase === 'allocating') {
      if (checkIfHeapFull()) {
        simulateMarkPhase();
        return; // Don't increment step here, it will be done in the timeout
      } else {
        simulateAllocation();
      }
    } else if (phase === 'marking') {
      // This is handled by the timeout in simulateMarkPhase
      return;
    } else if (phase === 'sweeping') {
      setGcCycles(prev => prev + 1);
      if (gcCycles < 3) {
        setPhase('allocating');
        toast(`Ciclo GC ${gcCycles + 1} completado. Continuando...`);
      } else {
        setPhase('complete');
        setIsRunning(false);
        toast("Simulación completada después de 4 ciclos GC");
      }
    }
    setCurrentStep(prev => prev + 1);
  };

  const toggleSimulation = () => {
    if (phase === 'complete') {
      initializeHeap();
      return;
    }
    setIsRunning(!isRunning);
  };

  // Auto-step when running
  useEffect(() => {
    if (isRunning && phase !== 'complete') {
      const timer = setTimeout(nextStep, speed);
      return () => clearTimeout(timer);
    }
  }, [isRunning, currentStep, phase, speed]);

  // Reinitialize heap when grid size changes
  useEffect(() => {
    if (!isRunning) {
      initializeHeap();
    }
  }, [gridSize]);

  const getCellClassName = (cell: MemoryCell) => {
    switch (cell.state) {
      case CellState.FREE:
        return "bg-gc-free-cell text-gc-free-cell-foreground border-border";
      case CellState.REFERENCED:
        return "bg-gc-referenced-cell text-gc-referenced-cell-foreground border-gc-referenced-cell";
      case CellState.DEREFERENCED:
        return "bg-gc-dereferenced-cell text-gc-dereferenced-cell-foreground border-gc-dereferenced-cell";
      case CellState.MARKED:
        return "bg-gc-marked-cell text-gc-marked-cell-foreground border-gc-marked-cell";
      case CellState.SURVIVED:
        return "bg-gc-survived-cell text-gc-survived-cell-foreground border-gc-survived-cell";
      default:
        return "bg-gc-free-cell text-gc-free-cell-foreground border-border";
    }
  };

  return (
    <>
      <AppSidebar
        gridSize={gridSize}
        setGridSize={setGridSize}
        speed={speed}
        setSpeed={setSpeed}
        currentStep={currentStep}
        gcCycles={gcCycles}
        phase={phase}
        isRunning={isRunning}
        onToggleSimulation={toggleSimulation}
        onNextStep={nextStep}
        onReset={initializeHeap}
        collectorType="non-moving"
      />

      <StopTheWorldIndicator 
        phase={phase}
        isVisible={['marking', 'sweeping'].includes(phase)}
      />

      <main className="flex-1 bg-gradient-bg">
        {/* Header with Sidebar Trigger */}
        <header className="h-16 flex items-center border-b border-border bg-card/50 backdrop-blur-sm">
          <SidebarTrigger className="ml-4" />
          <div className="flex-1 text-center">
            <h1 className="text-2xl font-bold text-foreground">NON MOVING COLLECTOR</h1>
            <p className="text-sm text-muted-foreground">Demo</p>
          </div>
        </header>

        {/* Main Content */}
        <div className="p-4 h-[calc(100vh-4rem)] flex items-center justify-center">
          <Card className="w-full max-w-2xl lg:max-w-3xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-center text-lg">
                {phase === 'allocating' ? 'Allocating' : 'Heap'}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center p-4">
              <div 
                className="grid gap-1 w-full mx-auto"
                style={{ 
                  gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                  maxWidth: gridSize <= 10 ? '32rem' : gridSize <= 15 ? '40rem' : '48rem',
                  width: '100%'
                }}
              >
                {heap.map((cell) => (
                  <div
                    key={cell.id}
                    className={`
                      aspect-square border-2 rounded flex items-center justify-center font-bold
                      transition-all duration-300 ${getCellClassName(cell)}
                    `}
                    style={{ 
                      fontSize: gridSize > 18 ? '0.5rem' : gridSize > 15 ? '0.625rem' : '0.75rem'
                    }}
                  >
                    {cell.state === CellState.SURVIVED && cell.survivedCycles > 0 
                      ? cell.survivedCycles 
                      : ''
                    }
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
};
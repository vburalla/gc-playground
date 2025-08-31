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
  const [speed, setSpeed] = useState(1000); // milliseconds

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

      // Allocate 3-5 new objects randomly
      const allocateCount = Math.min(Math.floor(Math.random() * 3) + 3, freeCells.length);
      for (let i = 0; i < allocateCount; i++) {
        const randomIndex = Math.floor(Math.random() * freeCells.length);
        const cellToAllocate = freeCells.splice(randomIndex, 1)[0];
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
        if (cell.state === CellState.REFERENCED) {
          cell.state = CellState.MARKED;
        }
      });
      return newHeap;
    });
    setPhase('marking');
    toast("Marcando objetos en uso...");
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
      } else {
        simulateAllocation();
      }
    } else if (phase === 'marking') {
      simulateSweepPhase();
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
        <div className="p-6 h-[calc(100vh-4rem)] flex items-center justify-center">
          <Card className="w-full max-w-5xl">
            <CardHeader>
              <CardTitle className="text-center text-xl">
                {phase === 'allocating' ? 'Allocating' : 'Heap'}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              <div 
                className="grid gap-1 w-full max-w-4xl"
                style={{ 
                  gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
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
                      fontSize: gridSize > 18 ? '0.625rem' : gridSize > 15 ? '0.75rem' : '0.875rem'
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
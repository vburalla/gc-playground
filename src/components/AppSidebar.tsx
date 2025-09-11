import { Play, Pause, RotateCcw, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  gridSize: number;
  setGridSize: (size: number) => void;
  speed: number;
  setSpeed: (speed: number) => void;
  currentStep: number;
  gcCycles: number;
  phase: string;
  isRunning: boolean;
  onToggleSimulation: () => void;
  onNextStep: () => void;
  onReset: () => void;
  collectorType?: 'non-moving' | 'compacting' | 'copy' | 'generational' | 'g1';
  activeSpace?: 'from' | 'to';
  tenureThreshold?: number;
  setTenureThreshold?: (threshold: number) => void;
}

export function AppSidebar({
  gridSize,
  setGridSize,
  speed,
  setSpeed,
  currentStep,
  gcCycles,
  phase,
  isRunning,
  onToggleSimulation,
  onNextStep,
  onReset,
  collectorType = 'non-moving',
  activeSpace,
  tenureThreshold,
  setTenureThreshold,
}: AppSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-80"}>
      <SidebarTrigger className="m-2 self-end" />
      
      <SidebarContent>
        {/* Configuración */}
        <SidebarGroup>
          <SidebarGroupLabel>Configuration</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-4 p-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {!isCollapsed && (
                    collectorType === 'generational' ? "Eden Space Size" : 
                    collectorType === 'g1' ? "Region Grid" : 
                    "Memory Size"
                  )}
                </label>
                <select 
                  value={gridSize} 
                  onChange={(e) => setGridSize(Number(e.target.value))}
                  disabled={isRunning}
                  className="w-full p-2 rounded border bg-background text-foreground text-sm"
                  title={
                    collectorType === 'generational' ? "Eden Space Size" : 
                    collectorType === 'g1' ? "Region Grid" : 
                    "Memory Size"
                  }
                >
                  {collectorType === 'generational' ? (
                    <>
                      <option value={4}>13x10 (Eden: 4 cells)</option>
                      <option value={6}>19x15 (Eden: 6 cells)</option>
                      <option value={8}>26x20 (Eden: 8 cells)</option>
                    </>
                  ) : collectorType === 'g1' ? (
                    <>
                      <option value={5}>5x5 (25 regions)</option>
                      <option value={6}>6x6 (36 regions)</option>
                      <option value={7}>7x7 (49 regions)</option>
                    </>
                  ) : (
                    <>
                      <option value={10}>10x10 (100 cells)</option>
                      <option value={15}>15x15 (225 cells)</option>
                      <option value={20}>20x20 (400 cells)</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  {!isCollapsed && "Speed"}
                </label>
                <select 
                  value={speed} 
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="w-full p-2 rounded border bg-background text-foreground text-sm"
                  title="Speed"
                >
                  <option value={200}>Very Fast</option>
                  <option value={400}>Fast</option>
                  <option value={600}>Normal</option>
                  <option value={800}>Slow</option>
                  <option value={1200}>Very Slow</option>
                </select>
              </div>

              {/* Configuraciones específicas del Generational GC */}
              {collectorType === 'generational' && setTenureThreshold && tenureThreshold !== undefined && (
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {!isCollapsed && "Tenured Threshold"}
                  </label>
                  <select 
                    value={tenureThreshold} 
                    onChange={(e) => setTenureThreshold(Number(e.target.value))}
                    disabled={isRunning}
                    className="w-full p-2 rounded border bg-background text-foreground text-sm"
                    title="Cycles to move to Tenured"
                  >
                    <option value={2}>2 cycles</option>
                    <option value={3}>3 cycles</option>
                    <option value={4}>4 cycles</option>
                    <option value={5}>5 cycles</option>
                  </select>
                </div>
              )}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Controles */}
        <SidebarGroup>
          <SidebarGroupLabel>Controls</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-3 p-4">
              {!isCollapsed && (
                <div className="space-y-2 pb-3 border-b">
                  <p className="text-sm text-muted-foreground">Step: {currentStep}</p>
                  <p className="text-sm text-muted-foreground">GC Cycles: {gcCycles}</p>
                  <p className="text-sm text-muted-foreground">Phase: {phase}</p>
                  <p className="text-sm text-muted-foreground">
                    {collectorType === 'generational' ? `Eden ${gridSize}` : 
                     collectorType === 'g1' ? `Grid ${gridSize}x${gridSize}` : 
                     `${gridSize}x${gridSize}`}
                  </p>
                  {collectorType === 'copy' && activeSpace && (
                    <p className="text-sm text-muted-foreground">Active: {activeSpace === 'from' ? 'From' : 'To'} Space</p>
                  )}
                </div>
              )}
              
              <Button 
                onClick={onToggleSimulation}
                className="w-full"
                variant={isRunning ? "secondary" : "default"}
                size={isCollapsed ? "icon" : "default"}
                title={phase === 'complete' ? 'Restart' : isRunning ? 'Pause' : 'Start'}
              >
                {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {!isCollapsed && (
                  <span className="ml-2">
                    {phase === 'complete' ? 'Restart' : isRunning ? 'Pause' : 'Start'}
                  </span>
                )}
              </Button>
              
              <Button 
                onClick={onNextStep}
                disabled={isRunning || phase === 'complete'}
                className="w-full"
                variant="outline"
                size={isCollapsed ? "icon" : "default"}
                title="Next Step"
              >
                <SkipForward className="w-4 h-4" />
                {!isCollapsed && <span className="ml-2">Next Step</span>}
              </Button>
              
              <Button 
                onClick={onReset}
                className="w-full"
                variant="outline"
                size={isCollapsed ? "icon" : "default"}
                title="Restart"
              >
                <RotateCcw className="w-4 h-4" />
                {!isCollapsed && <span className="ml-2">Restart</span>}
              </Button>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Proceso */}
        {!isCollapsed && (
          <SidebarGroup>
            <SidebarGroupLabel>Process</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="p-4">
                <ol className="text-sm space-y-1 text-muted-foreground">
                  {collectorType === 'g1' ? (
                    <>
                      <li>1. Allocate objects in Eden regions</li>
                      <li>2. Eden regions full → G1 GC</li>
                      <li>3. Mark all live objects</li>
                      <li>4. Evacuate live objects to Survivor</li>
                      <li>5. Assign new regions dynamically</li>
                      <li>6. Clear collected regions</li>
                      <li>7. Resume allocation</li>
                    </>
                  ) : collectorType === 'generational' ? (
                    <>
                      <li>1. Allocate objects in Eden Space</li>
                      <li>2. Eden is full → Minor GC</li>
                      <li>3. Mark all live objects</li>
                      <li>4. Copy live objects to Survivor</li>
                      <li>5. Objects surviving N cycles → Tenured</li>
                      <li>6. Clear source spaces</li>
                      <li>7. Resume allocation</li>
                    </>
                  ) : collectorType === 'copy' ? (
                    <>
                      <li>1. Mutator allocates cells in active space</li>
                      <li>2. Active space is out of memory → GC</li>
                      <li>3. Mark all live cells</li>
                      <li>4. Copy live cells to other space</li>
                      <li>5. Swap active space</li>
                      <li>6. Resume Mutator</li>
                    </>
                  ) : (
                    <>
                      <li>1. Mutator allocates cells in Heap</li>
                      <li>2. Heap is out of memory → GC</li>
                      <li>3. Mark all live cells</li>
                      <li>4. Free all dead cells</li>
                      {collectorType === 'compacting' && (
                        <li>5. Compact live cells to beginning</li>
                      )}
                      <li>{collectorType === 'compacting' ? '6' : '5'}. Unmark all live cells</li>
                      <li>{collectorType === 'compacting' ? '7' : '6'}. Resume Mutator</li>
                    </>
                  )}
                </ol>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Leyenda */}
        <SidebarGroup>
          <SidebarGroupLabel>Legend</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="space-y-3 p-4">
              {collectorType === 'g1' ? (
                // G1 GC Region Legend
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-muted border-2 border-muted rounded flex-shrink-0"></div>
                    {!isCollapsed && <span className="text-sm">Unassigned Region</span>}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-yellow-500 border-2 border-yellow-600 rounded flex-shrink-0"></div>
                    {!isCollapsed && <span className="text-sm">Eden Region</span>}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-600 border-2 border-green-700 rounded flex-shrink-0"></div>
                    {!isCollapsed && <span className="text-sm">Survivor Region</span>}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-blue-400 border-2 border-blue-500 rounded flex-shrink-0"></div>
                    {!isCollapsed && <span className="text-sm">Tenured Region</span>}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-red-500 border-2 border-red-600 rounded flex-shrink-0"></div>
                    {!isCollapsed && <span className="text-sm">Humongous Region</span>}
                  </div>
                </>
              ) : (
                // Standard GC Cell Legend
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-gc-free-cell border-2 border-border rounded flex-shrink-0"></div>
                    {!isCollapsed && <span className="text-sm">Free Cell</span>}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-gc-referenced-cell border-2 border-gc-referenced-cell rounded flex-shrink-0"></div>
                    {!isCollapsed && <span className="text-sm">Referenced Cell</span>}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-gc-dereferenced-cell border-2 border-gc-dereferenced-cell rounded flex-shrink-0"></div>
                    {!isCollapsed && <span className="text-sm">Dereferenced Cell</span>}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-gc-marked-cell border-2 border-gc-marked-cell rounded flex-shrink-0"></div>
                    {!isCollapsed && <span className="text-sm">Marked Cell</span>}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-gc-survived-cell border-2 border-gc-survived-cell rounded flex items-center justify-center text-xs font-bold text-gc-survived-cell-foreground flex-shrink-0">
                      1
                    </div>
                    {!isCollapsed && <span className="text-sm">Referenced Cell (survived 1 GC)</span>}
                  </div>
                </>
              )}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
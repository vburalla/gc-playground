import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Database, Server, Clock } from "lucide-react";

type ThreadType = "PLATFORM" | "VIRTUAL";
type TaskType = "CPU" | "IO";
type VirtualThreadState = "NEW" | "MOUNTED" | "UNMOUNTED" | "RUNNABLE" | "DONE";
type PlatformThreadState = "CREATING" | "REQUESTING_OS" | "MAPPING" | "RUNNING" | "DONE";

interface Task {
  id: number;
  type: TaskType;
  threadId: number | null;
}

// --- Platform Mode Types ---
interface OSThread {
  id: number;
  platformThreadId: number | null;
  isBlocked: boolean;
}

interface PlatformThread {
  id: number;
  osThreadId: number;
  task: Task;
  state: PlatformThreadState;
}

// --- Virtual Mode Types ---
interface VirtualThread {
  id: number;
  state: VirtualThreadState;
  task: Task;
  carrierId: number | null;
}

interface CarrierThread {
  id: number;
  osThreadId: number;
  mountedVirtualThreadId: number | null;
}

const MAX_OS_THREADS = 4;
const MAX_CARRIER_THREADS = 2;
const IO_BLOCK_DURATION = 5000;
const CPU_TASK_DURATION = 3000;
const VIRTUAL_THREAD_MOUNT_DELAY = 2000;
const LEGEND_DURATION = 1800;

const Legend = ({ text }: { text: string }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="text-xs font-semibold text-primary/90 text-center"
    >
        {text}
    </motion.div>
);

const VirtualLegendDisplay = ({ legends }: { legends: string[] }) => (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full flex flex-col items-center gap-2 z-20">
        <AnimatePresence>
            {legends.map((legend, index) => (
                <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    className="bg-primary/90 text-primary-foreground p-2 rounded-md shadow-lg text-sm font-semibold"
                >
                    {legend}
                </motion.div>
            ))}
        </AnimatePresence>
    </div>
);

const ThreadStack = ({ show, size }: { show: boolean, size: string }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto", transition: { delay: 0.5 } }}
        exit={{ opacity: 0, height: 0 }}
        className="w-full bg-muted/60 p-2 rounded-sm text-center mt-2 border border-dashed"
      >
        <p className="text-[10px] font-mono font-semibold">Stack</p>
        <p className="text-[9px] font-mono text-muted-foreground">{size}</p>
      </motion.div>
    )}
  </AnimatePresence>
);

const PlatformThreadComponent = ({ thread }: { thread: PlatformThread }) => (
  <motion.div
    layoutId={`platform-thread-${thread.id}`}
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.5 } }}
    className="relative w-36 h-48 bg-card border rounded-lg p-2 flex flex-col items-center shadow-md"
  >
    <AnimatePresence>
        {thread.state === "CREATING" && <Legend text="Creando Thread..." />}
    </AnimatePresence>
    <Badge variant="secondary" className="text-[10px]">Platform Thread {thread.id}</Badge>
    <div className="w-full h-full mt-1 flex flex-col items-center justify-center overflow-y-auto p-1 bg-background/50 rounded">
        <ThreadStack show={thread.state === "RUNNING"} size="~1 MB" />
        <AnimatePresence>
        {thread.state === 'RUNNING' && (
            <motion.div initial={{opacity:0}} animate={{opacity:1, transition:{delay:0.5}}} exit={{opacity:0}} className="flex flex-col items-center gap-1 text-primary">
                <Clock size={24} className="animate-spin" />
                <p className="text-xs font-mono">Ejecutando...</p>
            </motion.div>
        )}
        </AnimatePresence>
    </div>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.3 } }} className="absolute -bottom-7 text-center">
      <Badge variant={thread.task.type === "IO" ? "destructive" : "default"}>Task {thread.task.id} ({thread.task.type})</Badge>
    </motion.div>
  </motion.div>
);

const CarrierThreadComponent = ({ thread, virtualThread }: { thread: CarrierThread, virtualThread: VirtualThread | undefined }) => {
    const label = virtualThread ? "Carrier Thread" : "Platform Thread";
    return (
        <motion.div
            layout
            className="relative w-36 h-48 bg-card border rounded-lg p-2 flex flex-col items-center shadow-md"
        >
            <Badge variant="secondary" className="text-[10px]">{label} {thread.id}</Badge>
            <div className="w-full h-full mt-1 flex flex-col items-center justify-center overflow-y-auto p-1 bg-background/50 rounded">
                <AnimatePresence>
                    {virtualThread && (
                        <motion.div layoutId={`vthread-anim-${virtualThread.id}`}>
                            <VirtualThreadComponent vThread={virtualThread} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};


const OSThreadComponent = ({ osThread, isCarrier = false }: { osThread: OSThread | CarrierThread, isCarrier?: boolean }) => (
    <motion.div layout animate={{
        borderColor: (osThread as OSThread).isBlocked ? "hsl(0, 72%, 51%)" : "hsl(var(--primary))",
        backgroundColor: (osThread as OSThread).isBlocked ? "hsla(0, 72%, 51%, 0.1)" : "hsla(var(--muted))"
    }} transition={{ duration: 0.5 }}
        className={`relative w-36 h-48 border-2 border-dashed rounded-lg p-2 flex flex-col items-center justify-center shadow-inner bg-muted/30`}>
        <Badge variant="outline" className="text-[10px]">{isCarrier ? 'Carrier' : 'OS'} Thread {osThread.id}</Badge>
        <AnimatePresence>
        {(osThread as OSThread).isBlocked && (
             <motion.div
                initial={{opacity: 0, scale: 0.8}}
                animate={{opacity: 1, scale: 1}}
                exit={{opacity: 0, scale: 0.8}}
                className="absolute inset-0 flex flex-col items-center justify-center bg-red-500/10 rounded-lg"
             >
                 <p className="font-bold text-red-500 text-sm">BLOCKED</p>
                 <Database className="text-red-500 mt-1" size={20}/>
             </motion.div>
        )}
        </AnimatePresence>
    </motion.div>
);

const ConnectingLine = ({ visible }: { visible: boolean }) => (
    <AnimatePresence>
        {visible && <motion.div initial={{scaleX: 0}} animate={{scaleX: 1, transition: {duration: 0.5, delay: 0.5}}} exit={{scaleX: 0}} className="h-0.5 w-full bg-primary/70 origin-left" />}
    </AnimatePresence>
)

const VirtualThreadComponent = ({ vThread }: { vThread: VirtualThread }) => {
    const stateConfig = {
        NEW: 'bg-blue-100 border-blue-300 text-blue-800',
        MOUNTED: 'bg-green-100 border-green-300 text-green-800',
        UNMOUNTED: 'bg-amber-100 border-amber-300 text-amber-800',
        RUNNABLE: 'bg-purple-100 border-purple-300 text-purple-800',
        DONE: 'bg-gray-100 border-gray-300 text-gray-500',
    };
    const stateName = {
        NEW: 'New',
        MOUNTED: 'Mounted',
        UNMOUNTED: 'Unmounted (in Heap)',
        RUNNABLE: 'Runnable',
        DONE: 'Done',
    }

    return (
    <motion.div
        className={`w-32 h-16 border rounded-md p-1 flex flex-col justify-center items-center text-center shadow-sm ${stateConfig[vThread.state]}`}>
        <p className="text-[10px] font-bold">Virtual Thread {vThread.id}</p>
        <p className="text-[9px]">Task {vThread.task.id} ({vThread.task.type})</p>
        <p className="text-[9px] font-semibold">{stateName[vThread.state]}</p>
    </motion.div>
    );
}

const PlatformSimulationRow = ({ osThread, platformThread }: { osThread: OSThread, platformThread: PlatformThread | undefined }) => (
    <div className="w-full flex items-center justify-center gap-4 my-8 h-52">
        <div className="w-40 flex justify-center">
            <AnimatePresence>
                {platformThread && platformThread.state !== 'DONE' && <PlatformThreadComponent thread={platformThread} />}
            </AnimatePresence>
        </div>
        <div className="w-32 flex flex-col items-center justify-center gap-1">
            <AnimatePresence mode="wait">
                {platformThread?.state === 'REQUESTING_OS' && <Legend text="Petición de creación de un thread nativo (OS)" />}
                {platformThread?.state === 'MAPPING' && <Legend text="Mapeo 1-a-1" />}
            </AnimatePresence>
            <ConnectingLine visible={!!platformThread && platformThread.state !== 'CREATING' && platformThread.state !== 'DONE'} />
        </div>
        <div className="w-40 flex justify-center">
            <OSThreadComponent osThread={osThread} />
        </div>
    </div>
)

export const VirtualThreadsSimulator = () => {
  const [mode, setMode] = useState<ThreadType>("PLATFORM");
  const [tasks, setTasks] = useState<Task[]>([]);
  const nextTaskId = useRef(1);

  // Platform state
  const [platformThreads, setPlatformThreads] = useState<PlatformThread[]>([]);
  const [osThreads, setOsThreads] = useState<OSThread[]>([]);
  const nextPlatformThreadId = useRef(1);

  // Virtual state
  const [virtualThreads, setVirtualThreads] = useState<VirtualThread[]>([]);
  const [carrierThreads, setCarrierThreads] = useState<CarrierThread[]>([]);
  const [carrierOsThreads, setCarrierOsThreads] = useState<OSThread[]>([]);
  const [virtualLegends, setVirtualLegends] = useState<string[]>([]);
  const nextVirtualThreadId = useRef(1);
  const [processingVirtualThreadId, setProcessingVirtualThreadId] = useState<number | null>(null);

  const resetSimulation = () => {
    setTasks([]);
    setPlatformThreads([]);
    setOsThreads(Array.from({ length: MAX_OS_THREADS }, (_, i) => ({ id: i + 1, platformThreadId: null, isBlocked: false })));
    nextPlatformThreadId.current = 1;
    setVirtualThreads([]);
    setCarrierOsThreads(Array.from({ length: MAX_CARRIER_THREADS }, (_, i) => ({ id: i + 101, platformThreadId: i + 1, isBlocked: false })));
    setCarrierThreads(Array.from({ length: MAX_CARRIER_THREADS }, (_, i) => ({ id: i + 1, osThreadId: i + 101, mountedVirtualThreadId: null })));
    setVirtualLegends([]);
    nextVirtualThreadId.current = 1;
    nextTaskId.current = 1;
    setProcessingVirtualThreadId(null);
  };

  useEffect(() => { resetSimulation(); }, [mode]);

  const addTask = (type: TaskType) => {
    const newTask: Task = { id: nextTaskId.current++, type, threadId: null };
    setTasks(prev => [...prev, newTask]);
  };

  useEffect(() => {
    if (mode === 'PLATFORM') {
        const taskToProcess = tasks.find(t => t.threadId === null);
        const availableOSThread = osThreads.find(ot => ot.platformThreadId === null);

        if (taskToProcess && availableOSThread) {
            const newPThreadId = nextPlatformThreadId.current++;
            setTasks(prev => prev.map(t => t.id === taskToProcess.id ? { ...t, threadId: newPThreadId } : t));
            setOsThreads(prev => prev.map(ot => ot.id === availableOSThread.id ? { ...ot, platformThreadId: newPThreadId } : ot));

            const newPThread: PlatformThread = { id: newPThreadId, osThreadId: availableOSThread.id, task: taskToProcess, state: "CREATING" };
            setPlatformThreads(prev => [...prev, newPThread]);

            setTimeout(() => {
                setPlatformThreads(prev => prev.map(pt => pt.id === newPThreadId ? { ...pt, state: "REQUESTING_OS" } : pt));
                setTimeout(() => {
                    setPlatformThreads(prev => prev.map(pt => pt.id === newPThreadId ? { ...pt, state: "MAPPING" } : pt));
                    setTimeout(() => {
                        setPlatformThreads(prev => prev.map(pt => pt.id === newPThreadId ? { ...pt, state: "RUNNING" } : pt));
                        setOsThreads(prev => prev.map(ot => ot.id === availableOSThread.id ? { ...ot, isBlocked: taskToProcess.type === 'IO' } : ot));
                        
                        const duration = taskToProcess.type === 'IO' ? IO_BLOCK_DURATION : CPU_TASK_DURATION;
                        setTimeout(() => {
                            setPlatformThreads(prev => prev.map(pt => pt.id === newPThreadId ? { ...pt, state: "DONE" } : pt));
                            setOsThreads(prev => prev.map(ot => ot.id === availableOSThread.id ? { ...ot, platformThreadId: null, isBlocked: false } : ot));
                        }, duration);
                    }, 1500);
                }, 1500);
            }, 1000);
        }
    }
  }, [tasks, osThreads, mode, nextPlatformThreadId.current]);


  useEffect(() => {
    if (mode === 'VIRTUAL') {
      // 1. Create new virtual threads from pending tasks
      const newTasks = tasks.filter(t => t.threadId === null);
      if (newTasks.length > 0) {
        const newVThreads = newTasks.map(task => ({ id: nextVirtualThreadId.current++, state: "NEW" as VirtualThreadState, task, carrierId: null }));
        setVirtualThreads(prev => [...prev, ...newVThreads]);
        setTasks(prev => prev.map(t => {
          const v = newVThreads.find(vt => vt.task.id === t.id);
          return v ? { ...t, threadId: v.id } : t;
        }));
      }

      // 2. Mount virtual threads to carrier threads
      if (processingVirtualThreadId === null) { // Only process one at a time
        const mountableVThread = virtualThreads.find(vt =>
          (vt.state === "NEW" || vt.state === "RUNNABLE") && vt.carrierId === null
        );
        const availableCarrier = carrierThreads.find(ct => ct.mountedVirtualThreadId === null);

        if (mountableVThread && availableCarrier) {
          setProcessingVirtualThreadId(mountableVThread.id); // Mark as processing

          const wasRunnable = mountableVThread.state === 'RUNNABLE';

          // Update virtual thread and carrier thread states
          setVirtualThreads(prev => prev.map(vt =>
            vt.id === mountableVThread.id ? { ...vt, state: "MOUNTED", carrierId: availableCarrier.id } : vt
          ));
          setCarrierThreads(prev => prev.map(ct =>
            ct.id === availableCarrier.id ? { ...ct, mountedVirtualThreadId: mountableVThread.id } : ct
          ));

          const mountLegend = wasRunnable
            ? `Montando Tarea I/O ${mountableVThread.task.id} para finalizar`
            : `Montando Tarea ${mountableVThread.task.id} (${mountableVThread.task.type})`;
          setVirtualLegends(prev => [...prev, mountLegend]);
          setTimeout(() => setVirtualLegends(prev => prev.filter(l => l !== mountLegend)), LEGEND_DURATION);

          setTimeout(() => {
            if (mountableVThread.task.type === 'IO' && !wasRunnable) {
              // I/O task: Unmount and save to Heap
              const unmountLegend = `Tarea I/O ${mountableVThread.task.id} bloqueada. Desmontando y guardando en Heap.`;
              setVirtualLegends(prev => [...prev, unmountLegend]);
              setTimeout(() => setVirtualLegends(prev => prev.filter(l => l !== unmountLegend)), LEGEND_DURATION);

              setVirtualThreads(prev => prev.map(vt =>
                vt.id === mountableVThread.id ? { ...vt, state: "UNMOUNTED", carrierId: null } : vt
              ));
              setCarrierThreads(prev => prev.map(ct =>
                ct.id === availableCarrier.id ? { ...ct, mountedVirtualThreadId: null } : ct
              ));

              setTimeout(() => {
                const runnableLegend = `Tarea I/O ${mountableVThread.task.id} completada. Thread listo para re-montar.`;
                setVirtualLegends(prev => [...prev, runnableLegend]);
                setTimeout(() => setVirtualLegends(prev => prev.filter(l => l !== runnableLegend)), LEGEND_DURATION);
                setVirtualThreads(prev => prev.map(vt =>
                  vt.id === mountableVThread.id ? { ...vt, state: "RUNNABLE" } : vt
                ));
                setProcessingVirtualThreadId(null); // Done processing this thread
              }, IO_BLOCK_DURATION);

            } else {
              // CPU task or finishing I/O task
              const duration = wasRunnable ? 1500 : CPU_TASK_DURATION;
              setTimeout(() => {
                setVirtualThreads(prev => prev.map(vt =>
                  vt.id === mountableVThread.id ? { ...vt, state: "DONE" } : vt
                ));
                setCarrierThreads(prev => prev.map(ct =>
                  ct.id === availableCarrier.id ? { ...ct, mountedVirtualThreadId: null } : ct
                ));
                setProcessingVirtualThreadId(null); // Done processing this thread
              }, duration);
            }
          }, VIRTUAL_THREAD_MOUNT_DELAY);
        }
      }
    }
  }, [tasks, virtualThreads, carrierThreads, mode, processingVirtualThreadId, nextVirtualThreadId.current]);

  useEffect(() => {
    const doneThreads = platformThreads.filter(pt => pt.state === 'DONE');
    if (doneThreads.length > 0) {
        setTimeout(() => {
            setPlatformThreads(prev => prev.filter(pt => pt.state !== 'DONE'));
            setTasks(prev => prev.filter(t => !doneThreads.some(dt => dt.task.id === t.id)));
        }, 500);
    }
  }, [platformThreads]);

  useEffect(() => {
    const doneVThreads = virtualThreads.filter(vt => vt.state === 'DONE');
    if (doneVThreads.length > 0) {
        setTimeout(() => {
            setVirtualThreads(prev => prev.filter(vt => vt.state !== 'DONE'));
            setTasks(prev => prev.filter(t => !doneVThreads.some(dvt => dvt.task.id === t.id)));
        }, 500);
    }
  }, [virtualThreads]);

  return (
    <div className="flex-1 p-4 overflow-auto">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Java Virtual Threads Simulator</h1>
          <p className="text-xs text-muted-foreground">An interactive simulation to understand the difference between Platform and Virtual Threads.</p>
        </div>

        <Card className="bg-card/50 backdrop-blur sticky top-0 z-10">
          <CardContent className="pt-3 pb-3 flex items-center justify-center gap-4">
            <Label htmlFor="thread-mode" className={`text-sm font-semibold ${mode === 'PLATFORM' ? 'text-primary' : ''}`}>Platform Threads</Label>
            <Switch id="thread-mode" checked={mode === "VIRTUAL"} onCheckedChange={(c) => setMode(c ? "VIRTUAL" : "PLATFORM")} />
            <Label htmlFor="thread-mode" className={`text-sm font-semibold ${mode === 'VIRTUAL' ? 'text-primary' : ''}`}>Virtual Threads</Label>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle>Controls</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Add tasks to see how threads are handled.</p>
              <div className="flex gap-2">
                <Button onClick={() => addTask("CPU")} className="w-full"><Cpu size={16} className="mr-2" /> Add CPU Task</Button>
                <Button onClick={() => addTask("IO")} variant="destructive" className="w-full"><Database size={16} className="mr-2" /> Add I/O Task</Button>
              </div>
              <Button onClick={resetSimulation} variant="outline" className="w-full">Reset</Button>
              <div className="space-y-2 pt-4">
                <h3 className="text-sm font-semibold">Task Queue</h3>
                <AnimatePresence>
                  {tasks.filter(t => t.threadId === null).map(task => (
                    <motion.div key={task.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-muted/70 p-2 rounded-md text-xs flex items-center justify-between">
                      <span>Task #{task.id} ({task.type}-bound)</span>
                      <Badge variant={task.type === 'IO' ? 'destructive' : 'default'}>{task.type}</Badge>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {tasks.filter(t => t.threadId === null).length === 0 && <p className="text-xs text-muted-foreground text-center pt-2">No tasks in queue.</p>}
              </div>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            {mode === 'PLATFORM' ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>JVM</CardTitle>
                    <CardTitle>Operating System</CardTitle>
                </CardHeader>
                <CardContent className="min-h-[600px]">
                    {osThreads.map(osThread => {
                        const pThread = platformThreads.find(pt => pt.osThreadId === osThread.id);
                        return <PlatformSimulationRow key={osThread.id} osThread={osThread} platformThread={pThread} />
                    })}
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader><CardTitle>JVM</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                        <h3 className="text-center text-sm font-semibold mb-2">Virtual Thread Pool</h3>
                        <div className="flex flex-wrap gap-2 justify-center min-h-[80px] bg-muted/30 rounded-lg p-2">
                            <AnimatePresence>
                                {virtualThreads.filter(vt => vt.state === 'NEW').map(vt => (
                                    <motion.div layoutId={`vthread-anim-${vt.id}`} key={vt.id}>
                                        <VirtualThreadComponent vThread={vt} />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                             {virtualThreads.filter(vt => vt.state === 'NEW' || vt.state === 'DONE').length === 0 && <p className="text-xs text-muted-foreground text-center pt-2">No new virtual threads.</p>}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-center text-sm font-semibold mb-2 flex items-center justify-center gap-2"><Server size={16} /> Heap</h3>
                         <div className="flex flex-wrap gap-2 justify-center min-h-[80px] bg-muted/30 rounded-lg p-2">
                            <AnimatePresence>
                                {virtualThreads.filter(vt => vt.state === 'UNMOUNTED' || vt.state === 'RUNNABLE').map(vt => (
                                    <motion.div layoutId={`vthread-anim-${vt.id}`} key={vt.id}>
                                        <VirtualThreadComponent vThread={vt} />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                             {virtualThreads.filter(vt => vt.state === 'UNMOUNTED' || vt.state === 'RUNNABLE').length === 0 && <p className="text-xs text-muted-foreground text-center pt-2">Heap is empty.</p>}
                        </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30 relative">
                    <CardHeader>
                        <CardTitle>Operating System</CardTitle>
                    </CardHeader>
                    <VirtualLegendDisplay legends={virtualLegends} />
                    <CardContent className="min-h-[250px] pt-8 grid grid-cols-2 gap-4">
                        <div className="space-y-4">
                            {carrierThreads.filter((_, i) => i % 2 === 0).map(carrierThread => {
                                const osThread = carrierOsThreads.find(cot => cot.id === carrierThread.osThreadId);
                                const virtualThread = virtualThreads.find(vt => vt.carrierId === carrierThread.id);
                                return (
                                    <div key={carrierThread.id} className="w-full flex items-center justify-center gap-4 h-24">
                                        <div className="w-40 flex justify-center">
                                            <CarrierThreadComponent thread={carrierThread} virtualThread={virtualThread} />
                                        </div>
                                        <div className="w-32 flex flex-col items-center justify-center gap-1">
                                            <ConnectingLine visible={true} />
                                        </div>
                                        {osThread && <div className="w-40 flex justify-center">
                                            <OSThreadComponent osThread={osThread} />
                                        </div>}
                                    </div>
                                )
                            })}
                        </div>
                        <div className="space-y-4">
                            {carrierThreads.filter((_, i) => i % 2 !== 0).map(carrierThread => {
                                const osThread = carrierOsThreads.find(cot => cot.id === carrierThread.osThreadId);
                                const virtualThread = virtualThreads.find(vt => vt.carrierId === carrierThread.id);
                                return (
                                    <div key={carrierThread.id} className="w-full flex items-center justify-center gap-4 h-24">
                                        <div className="w-40 flex justify-center">
                                            <CarrierThreadComponent thread={carrierThread} virtualThread={virtualThread} />
                                        </div>
                                        <div className="w-32 flex flex-col items-center justify-center gap-1">
                                            <ConnectingLine visible={true} />
                                        </div>
                                        {osThread && <div className="w-40 flex justify-center">
                                            <OSThreadComponent osThread={osThread} />
                                        </div>}
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-3 pb-3">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">{mode === "VIRTUAL" ? "Virtual Threads" : "Platform Threads"}</h3>
              {mode === "PLATFORM" ? (
                <div className="space-y-1 text-[11px]">
                  <p><strong>Platform Threads:</strong> Each thread is a wrapper for an OS thread (1:1 mapping). Creating them is expensive.</p>
                  <ul className="list-disc list-inside space-y-0.5 ml-2">
                    <li>When a task is assigned, a new Platform Thread is created and mapped to an available OS Thread.</li>
                    <li>If the task performs a blocking I/O operation, the Platform Thread and the OS Thread are **blocked**, waiting for the operation to complete.</li>
                    <li>The number of concurrent tasks is limited by the number of OS threads.</li>
                  </ul>
                </div>
              ) : (
                <div className="space-y-1 text-[11px]">
                  <p><strong>Virtual Threads:</strong> Lightweight threads managed by the JVM, not the OS.</p>
                  <ul className="list-disc list-inside space-y-0.5 ml-2">
                    <li>Many virtual threads run on a small number of "carrier" platform threads.</li>
                    <li>When a virtual thread performs a blocking I/O operation, it is **unmounted** from its carrier thread and its data is saved on the **Heap**.</li>
                    <li>The carrier thread is now free to execute other virtual threads.</li>
                    <li>Once the I/O operation is done, the virtual thread becomes **runnable** again and and waits for a carrier to continue execution.</li>
                    <li>This allows for massive concurrency with a small OS thread pool, ideal for I/O-bound applications.</li>
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Database, ChevronsRight, Link2 } from "lucide-react";

type ThreadType = "PLATFORM" | "VIRTUAL";
type TaskType = "CPU" | "IO";
type VirtualThreadState = "NEW" | "MOUNTED" | "UNMOUNTED" | "DONE";
type PlatformThreadState = "NEW" | "BINDING" | "RUNNING" | "DONE";

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
  osThreadId: number | null;
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
  mountedVirtualThreadId: number | null;
}

const MAX_OS_THREADS = 4;
const MAX_CARRIER_THREADS = 2;
const IO_BLOCK_DURATION = 4000;
const CPU_TASK_DURATION = 2500;
const SIMULATION_INTERVAL = 1000;

const ThreadStack = ({ type, show, size }: { type: ThreadType, show: boolean, size: string }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0, height: 0, y: 20 }}
        animate={{ opacity: 1, height: "auto", y: 0, transition: { delay: 0.5 } }}
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
    layout
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.5 } }}
    className="relative w-36 h-56 bg-card border rounded-lg p-2 flex flex-col items-center shadow-md"
  >
    <Badge variant="secondary" className="text-[10px]">Platform Thread {thread.id}</Badge>
    <div className="w-full h-full mt-1 flex flex-col items-center overflow-y-auto p-1 bg-background/50 rounded">
        <ThreadStack type="PLATFORM" show={thread.state !== "NEW"} size="~1 MB" />
    </div>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.3 } }} className="absolute -bottom-7 text-center">
      <Badge variant={thread.task.type === "IO" ? "destructive" : "default"}>Task {thread.task.id} ({thread.task.type})</Badge>
    </motion.div>
  </motion.div>
);

const OSThreadComponent = ({ osThread, children, isCarrier = false }: { osThread: OSThread | CarrierThread, children?: React.ReactNode, isCarrier?: boolean }) => (
    <motion.div layout animate={{ borderColor: (osThread as OSThread).isBlocked ? "hsl(0, 72%, 51%)" : "hsl(var(--primary))", backgroundColor: (osThread as OSThread).isBlocked ? "hsla(0, 72%, 51%, 0.1)" : "hsla(var(--muted))" }} transition={{ duration: 0.5 }}
        className={`relative w-40 h-64 border-2 border-dashed rounded-lg p-2 flex flex-col items-center justify-end shadow-inner bg-muted/30`}>
        
        {children && (
            <motion.div initial={{height: 0}} animate={{height: '20%'}} className="w-0.5 bg-primary/50 absolute top-8"/>
        )}

        <Badge variant="outline" className="absolute top-2 text-[10px]">{isCarrier ? 'Carrier' : 'OS'} Thread {osThread.id}</Badge>
        
        {(osThread as OSThread).isBlocked && (
            <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="absolute top-1 right-1 text-red-500">
                <Database size={16} />
            </motion.div>
        )}
        <div className="mt-2 w-full h-full flex items-center justify-center">{children}</div>
    </motion.div>
);

const BindingComponent = () => (
    <motion.div initial={{scale: 0}} animate={{scale: 1, transition: {delay: 0.5, type: 'spring'}}} exit={{scale: 0}}
        className="absolute z-10 p-2 bg-primary/20 rounded-full">
        <Link2 className="text-primary"/>
    </motion.div>
)

const VirtualThreadComponent = ({ vThread }: { vThread: VirtualThread }) => (
    <motion.div layout initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20, transition: { duration: 0.2 } }}
        className={`w-28 h-12 border rounded-md p-1 flex flex-col justify-center items-center text-center shadow-sm ${vThread.state === 'UNMOUNTED' ? 'bg-amber-100 border-amber-300' : 'bg-green-100 border-green-300'}`}>
        <p className="text-[10px] font-bold">Virtual Thread {vThread.id}</p>
        <p className="text-[9px]">Task {vThread.task.id} ({vThread.task.type})</p>
    </motion.div>
);

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
  const nextVirtualThreadId = useRef(1);

  const resetSimulation = () => {
    setTasks([]);
    setPlatformThreads([]);
    setOsThreads(Array.from({ length: MAX_OS_THREADS }, (_, i) => ({ id: i + 1, platformThreadId: null, isBlocked: false })));
    nextPlatformThreadId.current = 1;
    setVirtualThreads([]);
    setCarrierThreads(Array.from({ length: MAX_CARRIER_THREADS }, (_, i) => ({ id: i + 1, mountedVirtualThreadId: null })));
    nextVirtualThreadId.current = 1;
    nextTaskId.current = 1;
  };

  useEffect(() => { resetSimulation(); }, [mode]);

  const addTask = (type: TaskType) => {
    const newTask: Task = { id: nextTaskId.current++, type, threadId: null };
    setTasks(prev => [...prev, newTask]);
  };

  // --- Platform Mode Logic ---
  const handlePlatformTaskProcessing = () => {
    // 1. Create new platform threads for new tasks
    const taskToProcess = tasks.find(t => t.threadId === null);
    if (taskToProcess) {
        const newPThread: PlatformThread = { id: nextPlatformThreadId.current++, osThreadId: null, task: taskToProcess, state: "NEW" };
        setPlatformThreads(prev => [...prev, newPThread]);
        setTasks(prev => prev.map(t => t.id === taskToProcess.id ? { ...t, threadId: newPThread.id } : t));
    }

    // 2. Bind NEW threads to available OS threads
    const newPThreads = platformThreads.filter(pt => pt.state === "NEW");
    const availableOSThreads = osThreads.filter(ot => ot.platformThreadId === null);
    
    newPThreads.forEach(pThread => {
        const osThread = availableOSThreads.shift();
        if (osThread) {
            setPlatformThreads(prev => prev.map(pt => pt.id === pThread.id ? { ...pt, state: "BINDING", osThreadId: osThread.id } : pt));
            setOsThreads(prev => prev.map(ot => ot.id === osThread.id ? { ...ot, platformThreadId: pThread.id } : ot));

            // 3. After binding, move to RUNNING and handle task
            setTimeout(() => {
                setPlatformThreads(prev => prev.map(pt => pt.id === pThread.id ? { ...pt, state: "RUNNING" } : pt));
                setOsThreads(prev => prev.map(ot => ot.id === osThread.id ? { ...ot, isBlocked: pThread.task.type === 'IO' } : ot));

                const duration = pThread.task.type === 'IO' ? IO_BLOCK_DURATION : CPU_TASK_DURATION;
                setTimeout(() => {
                    setPlatformThreads(prev => prev.map(pt => pt.id === pThread.id ? { ...pt, state: "DONE" } : pt));
                    setOsThreads(prev => prev.map(ot => ot.id === osThread.id ? { ...ot, platformThreadId: null, isBlocked: false } : ot));
                    setTasks(prev => prev.filter(t => t.id !== pThread.task.id));
                }, duration);
            }, 1500); // Time for binding animation
        }
    });

    // 4. Clean up DONE threads
    if (platformThreads.some(pt => pt.state === "DONE")) {
        setTimeout(() => setPlatformThreads(prev => prev.filter(pt => pt.state !== "DONE")), 500);
    }
  };

  // --- Virtual Mode Logic ---
  const handleVirtualTaskProcessing = () => {
    const newTasks = tasks.filter(t => t.threadId === null);
    if (newTasks.length > 0) {
      const newVThreads = newTasks.map(task => ({ id: nextVirtualThreadId.current++, state: "NEW", task, carrierId: null }));
      setVirtualThreads(prev => [...prev, ...newVThreads]);
      setTasks(prev => prev.map(t => { const v = newVThreads.find(vt => vt.task.id === t.id); return v ? { ...t, threadId: v.id } : t; }));
    }

    const availableCarriers = carrierThreads.filter(ct => ct.mountedVirtualThreadId === null);
    const unmountedVThreads = virtualThreads.filter(vt => vt.state === "NEW");

    availableCarriers.forEach(carrier => {
      const vThreadToMount = unmountedVThreads.shift();
      if (vThreadToMount) {
        setVirtualThreads(prev => prev.map(vt => vt.id === vThreadToMount.id ? { ...vt, state: "MOUNTED", carrierId: carrier.id } : vt));
        setCarrierThreads(prev => prev.map(ct => ct.id === carrier.id ? { ...ct, mountedVirtualThreadId: vThreadToMount.id } : ct));
        
        if (vThreadToMount.task.type === 'IO') {
          setTimeout(() => {
            setVirtualThreads(prev => prev.map(vt => vt.id === vThreadToMount.id ? { ...vt, state: "UNMOUNTED", carrierId: null } : vt));
            setCarrierThreads(prev => prev.map(ct => ct.id === carrier.id ? { ...ct, mountedVirtualThreadId: null } : ct));
            setTimeout(() => {
              setVirtualThreads(prev => prev.map(vt => vt.id === vThreadToMount.id ? { ...vt, state: "DONE" } : vt));
              setTasks(prev => prev.filter(t => t.id !== vThreadToMount.task.id));
            }, IO_BLOCK_DURATION);
          }, 1000);
        } else {
          setTimeout(() => {
            setVirtualThreads(prev => prev.map(vt => vt.id === vThreadToMount.id ? { ...vt, state: "DONE" } : vt));
            setCarrierThreads(prev => prev.map(ct => ct.id === carrier.id ? { ...ct, mountedVirtualThreadId: null } : ct));
            setTasks(prev => prev.filter(t => t.id !== vThreadToMount.task.id));
          }, CPU_TASK_DURATION);
        }
      }
    });

    if (virtualThreads.some(vt => vt.state === "DONE")) {
        setTimeout(() => setVirtualThreads(prev => prev.filter(vt => vt.state !== "DONE")), 500);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (mode === 'PLATFORM') handlePlatformTaskProcessing();
      else handleVirtualTaskProcessing();
    }, SIMULATION_INTERVAL);
    return () => clearInterval(interval);
  }, [tasks, osThreads, carrierThreads, virtualThreads, platformThreads, mode]);

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
              <>
                <Card><CardHeader><CardTitle>JVM</CardTitle></CardHeader>
                  <CardContent className="min-h-[300px] flex flex-wrap gap-8 justify-center items-center">
                      <AnimatePresence>
                        {platformThreads.filter(pt => pt.state === 'NEW').map(thread => <PlatformThreadComponent key={thread.id} thread={thread} />)}
                      </AnimatePresence>
                      {platformThreads.length === 0 && <p className="text-sm text-muted-foreground">Waiting for tasks...</p>}
                  </CardContent>
                </Card>
                <Card className="bg-muted/30"><CardHeader><CardTitle>Operating System</CardTitle></CardHeader>
                  <CardContent className="min-h-[300px]">
                    <div className="flex flex-wrap gap-8 justify-center">
                      {osThreads.map(osThread => {
                        const platformThread = platformThreads.find(pt => pt.osThreadId === osThread.id);
                        return (
                            <OSThreadComponent key={osThread.id} osThread={osThread} isBlocked={osThread.isBlocked}>
                                {platformThread && <PlatformThreadComponent thread={platformThread} />}
                                {platformThread?.state === 'BINDING' && <BindingComponent />}
                            </OSThreadComponent>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card>
                  <CardHeader><CardTitle>JVM - Virtual Threads</CardTitle></CardHeader>
                  <CardContent className="min-h-[300px] grid grid-cols-2 gap-4">
                    <div className="border-r pr-4">
                        <h3 className="text-center text-sm font-semibold mb-2">Virtual Thread Pool</h3>
                        <div className="flex flex-wrap gap-2 justify-center">
                            <AnimatePresence>
                                {virtualThreads.filter(vt => vt.state === 'NEW' || vt.state === 'DONE').map(vt => <VirtualThreadComponent key={vt.id} vThread={vt} />)}
                            </AnimatePresence>
                             {virtualThreads.filter(vt => vt.state === 'NEW').length === 0 && <p className="text-xs text-muted-foreground text-center pt-2">No new virtual threads.</p>}
                        </div>
                    </div>
                    <div>
                        <h3 className="text-center text-sm font-semibold mb-2">I/O Waiting</h3>
                         <div className="flex flex-wrap gap-2 justify-center">
                            <AnimatePresence>
                                {virtualThreads.filter(vt => vt.state === 'UNMOUNTED').map(vt => <VirtualThreadComponent key={vt.id} vThread={vt} />)}
                            </AnimatePresence>
                             {virtualThreads.filter(vt => vt.state === 'UNMOUNTED').length === 0 && <p className="text-xs text-muted-foreground text-center pt-2">No I/O-bound threads waiting.</p>}
                        </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30"><CardHeader><CardTitle>OS - Carrier Threads</CardTitle></CardHeader>
                  <CardContent className="min-h-[250px]">
                    <div className="flex flex-wrap gap-8 justify-center">
                      {carrierThreads.map(ct => {
                        const mountedVThread = virtualThreads.find(vt => vt.carrierId === ct.id);
                        return (
                          <OSThreadComponent key={ct.id} osThread={ct} isCarrier={true}>
                            {mountedVThread && <VirtualThreadComponent vThread={mountedVThread} />}
                          </OSThreadComponent>
                        );
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
                    <li>When a virtual thread performs a blocking I/O operation, it is **unmounted** from its carrier thread.</li>
                    <li>The carrier thread is now free to execute other virtual threads.</li>
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
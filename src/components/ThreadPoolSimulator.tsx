import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type TaskType = "cpu" | "io";

interface Task {
  id: string;
  type: TaskType;
  state: "queue" | "processing" | "blocked";
}

interface Worker {
  id: number;
  status: "idle" | "working" | "blocked" | "stealing";
  currentTask: Task | null;
  queue?: Task[];
}

interface BlockingWorker {
  id: number;
  status: "idle" | "working" | "blocked";
  queue: Task[];
}

export const ThreadPoolSimulator = () => {
  const [mode, setMode] = useState<"threadpool" | "forkjoin">("threadpool");
  const [isRunning, setIsRunning] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [sharedQueue, setSharedQueue] = useState<Task[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([
    { id: 1, status: "idle", currentTask: null },
    { id: 2, status: "idle", currentTask: null },
    { id: 3, status: "idle", currentTask: null },
  ]);
  const [fjpWorkers, setFjpWorkers] = useState<Worker[]>([
    { id: 1, status: "working", currentTask: null, queue: [] },
    { id: 2, status: "working", currentTask: null, queue: [] },
    { id: 3, status: "idle", currentTask: null, queue: [] },
  ]);
  const [blockingWorkers, setBlockingWorkers] = useState<BlockingWorker[]>([
    { id: 1, status: "working", queue: [] },
    { id: 2, status: "working", queue: [] },
    { id: 3, status: "working", queue: [] },
  ]);
  const [showDeadlockWarning, setShowDeadlockWarning] = useState(false);
  const [blockingStatusText, setBlockingStatusText] = useState("");

  const createTask = (id: string, type: TaskType): Task => ({
    id,
    type,
    state: "queue",
  });

  const resetThreadPool = () => {
    setIsRunning(false);
    setStatusText("");
    setSharedQueue([]);
    setWorkers([
      { id: 1, status: "idle", currentTask: null },
      { id: 2, status: "idle", currentTask: null },
      { id: 3, status: "idle", currentTask: null },
    ]);
  };

  const resetForkJoinPool = () => {
    setIsRunning(false);
    setStatusText("");
    setFjpWorkers([
      { id: 1, status: "working", currentTask: null, queue: [] },
      { id: 2, status: "working", currentTask: null, queue: [] },
      { id: 3, status: "idle", currentTask: null, queue: [] },
    ]);
  };

  const resetBlockingAnimation = () => {
    setIsRunning(false);
    setBlockingStatusText("");
    setShowDeadlockWarning(false);
    setBlockingWorkers([
      { id: 1, status: "working", queue: [] },
      { id: 2, status: "working", queue: [] },
      { id: 3, status: "working", queue: [] },
    ]);
  };

  const startThreadPoolAnimation = async () => {
    setIsRunning(true);
    resetThreadPool();

    // Initialize shared queue with tasks
    const tasks: Task[] = [
      createTask("T1", "cpu"),
      createTask("T2", "io"),
      createTask("T3", "cpu"),
      createTask("T4", "cpu"),
      createTask("T5", "io"),
      createTask("T6", "cpu"),
    ];
    setSharedQueue(tasks);
    setStatusText("Cola compartida creada con 6 tareas (FIFO)");

    await new Promise((r) => setTimeout(r, 2000));

    // Worker 1 takes T1 (CPU)
    setStatusText("Worker 1 toma T1 (CPU) de la cola compartida");
    setSharedQueue((prev) => prev.slice(1));
    setWorkers((prev) =>
      prev.map((w) =>
        w.id === 1
          ? { ...w, status: "working", currentTask: { ...tasks[0], state: "processing" } }
          : w
      )
    );

    await new Promise((r) => setTimeout(r, 2000));

    // Worker 2 takes T2 (I/O) and blocks
    setStatusText("Worker 2 toma T2 (I/O) - SE BLOQUEA esperando respuesta");
    setSharedQueue((prev) => prev.slice(1));
    setWorkers((prev) =>
      prev.map((w) =>
        w.id === 2
          ? { ...w, status: "blocked", currentTask: { ...tasks[1], state: "blocked" } }
          : w
      )
    );

    await new Promise((r) => setTimeout(r, 2000));

    // Worker 3 takes T3 (CPU)
    setStatusText("Worker 3 toma T3 (CPU) mientras Worker 2 sigue bloqueado");
    setSharedQueue((prev) => prev.slice(1));
    setWorkers((prev) =>
      prev.map((w) =>
        w.id === 3
          ? { ...w, status: "working", currentTask: { ...tasks[2], state: "processing" } }
          : w
      )
    );

    await new Promise((r) => setTimeout(r, 2500));

    // Worker 1 finishes and takes T4
    setStatusText("Worker 1 termina T1 y toma T4 (CPU) de la cola");
    setSharedQueue((prev) => prev.slice(1));
    setWorkers((prev) =>
      prev.map((w) =>
        w.id === 1
          ? { ...w, status: "working", currentTask: { ...tasks[3], state: "processing" } }
          : w
      )
    );

    await new Promise((r) => setTimeout(r, 2500));

    // Worker 2 unblocks
    setStatusText("Worker 2 recibe respuesta I/O y termina T2");
    setWorkers((prev) =>
      prev.map((w) => (w.id === 2 ? { ...w, status: "idle", currentTask: null } : w))
    );

    await new Promise((r) => setTimeout(r, 1500));

    // Worker 2 takes T5 (I/O)
    setStatusText("Worker 2 toma T5 (I/O) - SE BLOQUEA nuevamente");
    setSharedQueue((prev) => prev.slice(1));
    setWorkers((prev) =>
      prev.map((w) =>
        w.id === 2
          ? { ...w, status: "blocked", currentTask: { ...tasks[4], state: "blocked" } }
          : w
      )
    );

    await new Promise((r) => setTimeout(r, 2500));

    // Worker 3 finishes and takes T6
    setStatusText("Worker 3 termina T3 y toma T6 (CPU)");
    setSharedQueue((prev) => prev.slice(1));
    setWorkers((prev) =>
      prev.map((w) =>
        w.id === 3
          ? { ...w, status: "working", currentTask: { ...tasks[5], state: "processing" } }
          : w
      )
    );

    await new Promise((r) => setTimeout(r, 2500));

    setStatusText("Animación completada - El pool maneja bien tareas I/O bloqueantes");
    setWorkers((prev) => prev.map((w) => ({ ...w, status: "idle", currentTask: null })));
    setIsRunning(false);
  };

  const startForkJoinAnimation = async () => {
    setIsRunning(true);
    resetForkJoinPool();

    // Initialize worker queues (newest-first for LIFO rendering)
    const workerATasks = [
      createTask("A4", "cpu"),
      createTask("A3", "cpu"),
      createTask("A2", "cpu"),
      createTask("A1", "cpu"),
    ];
    const workerBTasks = [
      createTask("B4", "cpu"),
      createTask("B3", "cpu"),
      createTask("B2", "cpu"),
      createTask("B1", "cpu"),
    ];
    const workerCTasks = [createTask("C2", "cpu"), createTask("C1", "cpu")];

    setFjpWorkers([
      { id: 1, status: "working", currentTask: null, queue: workerATasks },
      { id: 2, status: "working", currentTask: null, queue: workerBTasks },
      { id: 3, status: "working", currentTask: null, queue: workerCTasks },
    ]);
    setStatusText("1. Produciendo 10 tareas CPU-Bound. A (4), B (4), C (2).");

    await new Promise((r) => setTimeout(r, 2500));

    // Step 2: Process LIFO (A4, B4, C2)
    setStatusText("2. Todos los Workers procesan sus tareas más recientes (LIFO): A4, B4, C2.");
    setFjpWorkers((prev) =>
      prev.map((w) => {
        if (w.queue && w.queue.length > 0) {
          const task = w.queue[0]; // LIFO: newest is at index 0
          return {
            ...w,
            status: "working",
            currentTask: { ...task, state: "processing" },
            queue: w.queue.slice(1),
          };
        }
        return w;
      })
    );

    await new Promise((r) => setTimeout(r, 2000));

    // Clear current tasks
    setFjpWorkers((prev) => prev.map((w) => ({ ...w, currentTask: null })));
    await new Promise((r) => setTimeout(r, 500));

    // Step 3: Process LIFO again (A3, B3, C1)
    setStatusText("3. Procesando LIFO de nuevo: A3, B3, C1. Worker C quedará ocioso.");
    setFjpWorkers((prev) =>
      prev.map((w) => {
        if (w.queue && w.queue.length > 0) {
          const task = w.queue[0]; // LIFO: newest at index 0
          return {
            ...w,
            status: "working",
            currentTask: { ...task, state: "processing" },
            queue: w.queue.slice(1),
          };
        }
        return w;
      })
    );

    await new Promise((r) => setTimeout(r, 2000));

    // Worker C becomes idle
    setFjpWorkers((prev) =>
      prev.map((w) => (w.id === 3 ? { ...w, status: "idle", currentTask: null } : w))
    );

    await new Promise((r) => setTimeout(r, 2500));

    // Step 4: Worker C steals from A, A and B process LIFO
    setStatusText("4. Worker C (ocioso) busca trabajo. A y B procesan LIFO (A2, B2).");
    
    setFjpWorkers((prev) => {
      const newWorkers = [...prev];
      const workerA = newWorkers[0];
      
      // Worker A and B process their LIFO (take from front)
      newWorkers[0] = {
        ...workerA,
        currentTask: workerA.queue && workerA.queue.length > 0 
          ? { ...workerA.queue[0], state: "processing" } 
          : null,
        queue: workerA.queue ? workerA.queue.slice(1) : [],
      };

      const workerB = newWorkers[1];
      newWorkers[1] = {
        ...workerB,
        currentTask: workerB.queue && workerB.queue.length > 0
          ? { ...workerB.queue[0], state: "processing" }
          : null,
        queue: workerB.queue ? workerB.queue.slice(1) : [],
      };

      // Worker C steals from A (FIFO - oldest from updated A queue)
      const sourceQueue = newWorkers[0].queue || [];
      if (sourceQueue.length > 0) {
        const stolenTask = sourceQueue[sourceQueue.length - 1];
        newWorkers[0].queue = sourceQueue.slice(0, -1);
        newWorkers[2] = {
          ...newWorkers[2],
          status: "stealing",
          currentTask: { ...stolenTask, state: "processing" },
        };
      }
      
      return newWorkers;
    });

    await new Promise((r) => setTimeout(r, 2500));

    // Continúa el procesamiento sin limpiar tareas para mantener la robada en C

    // Step 5: C processes A1, A steals B1
    setStatusText("5. C procesa A1. A (ocioso) roba B1 (FIFO de B). B (ocioso) se queda sin nada que robar.");
    
    setFjpWorkers((prev) => {
      const newWorkers = [...prev];
      const workerB = newWorkers[1];
      
      // Worker C continues processing the stolen task
      newWorkers[2] = {
        ...newWorkers[2],
        status: "working",
      };

      // Worker A steals from B (FIFO - oldest from B)
      if (workerB.queue && workerB.queue.length > 0) {
        const stolenTask = workerB.queue[workerB.queue.length - 1];
        newWorkers[1].queue = workerB.queue.slice(0, -1);
        newWorkers[0] = {
          ...newWorkers[0],
          status: "stealing",
          currentTask: { ...stolenTask, state: "processing" },
        };
      }

      // Worker B becomes idle
      newWorkers[1] = {
        ...newWorkers[1],
        status: "idle",
        currentTask: null,
      };
      
      return newWorkers;
    });

    await new Promise((r) => setTimeout(r, 2500));

    // Step 6: Worker A processes B1
    setStatusText("6. Worker A procesa B1 (robada). Todas las colas están vacías.");
    await new Promise((r) => setTimeout(r, 2000));

    setStatusText("✅ Animación completada. Se demostró LIFO (local) y FIFO (robo).");
    setFjpWorkers((prev) =>
      prev.map((w) => ({ ...w, status: "idle", currentTask: null, queue: [] }))
    );
    setIsRunning(false);
  };

  const startBlockingAnimation = async () => {
    setIsRunning(true);
    resetBlockingAnimation();

    // Create all blocking tasks
    const blockingTasks = [
      // Worker A tasks
      { id: 'A1_CPU', type: 'cpu' as TaskType, state: 'queue' as const, worker: 1 },
      { id: 'A2_CPU', type: 'cpu' as TaskType, state: 'queue' as const, worker: 1 },
      { id: 'A3_CPU', type: 'cpu' as TaskType, state: 'queue' as const, worker: 1 },
      { id: 'A4_CPU', type: 'cpu' as TaskType, state: 'queue' as const, worker: 1 },
      { id: 'A5_IO', type: 'io' as TaskType, state: 'queue' as const, worker: 1 },
      { id: 'A6_CPU', type: 'cpu' as TaskType, state: 'queue' as const, worker: 1 },
      { id: 'A7_CPU', type: 'cpu' as TaskType, state: 'queue' as const, worker: 1 },
      // Worker B tasks
      { id: 'B1_CPU', type: 'cpu' as TaskType, state: 'queue' as const, worker: 2 },
      { id: 'B2_CPU', type: 'cpu' as TaskType, state: 'queue' as const, worker: 2 },
      { id: 'B3_CPU', type: 'cpu' as TaskType, state: 'queue' as const, worker: 2 },
      { id: 'B4_CPU', type: 'cpu' as TaskType, state: 'queue' as const, worker: 2 },
      { id: 'B5_IO', type: 'io' as TaskType, state: 'queue' as const, worker: 2 },
      { id: 'B6_CPU', type: 'cpu' as TaskType, state: 'queue' as const, worker: 2 },
      { id: 'B7_CPU', type: 'cpu' as TaskType, state: 'queue' as const, worker: 2 },
      // Worker C tasks
      { id: 'C1_CPU', type: 'cpu' as TaskType, state: 'queue' as const, worker: 3 },
      { id: 'C2_CPU', type: 'cpu' as TaskType, state: 'queue' as const, worker: 3 },
      { id: 'C3_CPU', type: 'cpu' as TaskType, state: 'queue' as const, worker: 3 },
      { id: 'C4_CPU', type: 'cpu' as TaskType, state: 'queue' as const, worker: 3 },
      { id: 'C5_IO', type: 'io' as TaskType, state: 'queue' as const, worker: 3 },
      { id: 'C6_CPU', type: 'cpu' as TaskType, state: 'queue' as const, worker: 3 },
      { id: 'C7_CPU', type: 'cpu' as TaskType, state: 'queue' as const, worker: 3 },
    ];

    // Distribute tasks to workers
    const workerQueues = [
      blockingTasks.filter(t => t.worker === 1).reverse(), // Reverse for LIFO display
      blockingTasks.filter(t => t.worker === 2).reverse(),
      blockingTasks.filter(t => t.worker === 3).reverse(),
    ];

    setBlockingWorkers([
      { id: 1, status: "working", queue: workerQueues[0] },
      { id: 2, status: "working", queue: workerQueues[1] },
      { id: 3, status: "working", queue: workerQueues[2] },
    ]);
    setBlockingStatusText(`1. Tareas CPU e I/O entran al Pool (3 Workers). Total: ${blockingTasks.length} tareas.`);

    await new Promise((r) => setTimeout(r, 2500));

    // Step 2: Process 6 CPU tasks (A7, A6, B7, B6, C7, C6)
    setBlockingStatusText("2. Los Workers ejecutan sus tareas más recientes (LIFO): A7, A6, B7, B6, C7, C6 (6 tareas CPU completadas).");
    
    // Remove 2 tasks from each queue
    for (let i = 0; i < 2; i++) {
      setBlockingWorkers((prev) =>
        prev.map((w) => ({
          ...w,
          queue: w.queue.slice(0, -1),
        }))
      );
      await new Promise((r) => setTimeout(r, 700));
    }

    await new Promise((r) => setTimeout(r, 1500));

    // Step 3: All workers hit I/O tasks and block
    setBlockingStatusText("3. Los 3 Workers golpean la siguiente tarea LIFO, que es I/O. ¡El Pool se BLOQUEA!");
    setBlockingWorkers((prev) =>
      prev.map((w) => ({
        ...w,
        status: "blocked",
        queue: w.queue.map((task, idx) =>
          idx === 0 ? { ...task, state: "blocked" } : task
        ),
      }))
    );

    await new Promise((r) => setTimeout(r, 2500));

    // Step 4: Show deadlock warning
    setBlockingStatusText("4. DEADLOCK: Los 3 Workers están paralizados. Las 12 tareas CPU restantes (A1-A4, B1-B4, C1-C4) están esperando.");
    setShowDeadlockWarning(true);

    await new Promise((r) => setTimeout(r, 4000));

    // Step 5: I/O completes
    setBlockingStatusText("5. Simulación: Las tareas I/O finalmente terminan. El Pool se desbloquea.");
    setShowDeadlockWarning(false);
    setBlockingWorkers((prev) =>
      prev.map((w) => {
        const idx = w.queue.findIndex((t) => t.state === "blocked");
        if (idx >= 0) {
          const newQueue = [...w.queue];
          newQueue.splice(idx, 1); // remove blocked task
          return { ...w, status: "working", queue: newQueue };
        }
        return { ...w, status: "working" };
      })
    );

    await new Promise((r) => setTimeout(r, 2500));

    // Step 6: Process remaining tasks quickly
    setBlockingStatusText("6. El Pool procesa las 12 tareas CPU restantes (A4, A3, A2, A1, etc.) en modo LIFO.");
    
    const processRemainingTasks = async () => {
      let any = true;
      while (any) {
        any = false;
        setBlockingWorkers((prev) => {
          const updated: BlockingWorker[] = prev.map((w) => {
            if (w.queue.length > 0) {
              any = true;
              const newQueue = w.queue.slice(1); // remove LIFO (front)
              return {
                ...w,
                queue: newQueue,
                status: (newQueue.length > 0 ? "working" : "idle") as BlockingWorker["status"],
              };
            }
            return { ...w, status: "idle" as BlockingWorker["status"] };
          });
          return updated;
        });
        if (any) await new Promise((r) => setTimeout(r, 500));
      }
    };

    await processRemainingTasks();

    setBlockingStatusText("✅ Animación completada. El bloqueo I/O paralizó el pool completo, dejando muchas tareas CPU esperando.");
    setIsRunning(false);
  };

  const handleToggle = () => {
    setMode((prev) => (prev === "threadpool" ? "forkjoin" : "threadpool"));
    if (mode === "threadpool") {
      resetThreadPool();
    } else {
      resetForkJoinPool();
      resetBlockingAnimation();
    }
  };

  return (
    <div className="min-h-screen bg-background w-full">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur w-full">
        <div className="w-full px-6 py-8">
          <h1
            className={`text-4xl font-bold text-center mb-2 font-mono transition-colors ${
              mode === "threadpool" ? "text-orange-500" : "text-green-500"
            }`}
          >
            {mode === "threadpool"
              ? "ThreadPoolTaskExecutor Simulator"
              : "ForkJoinPool Simulator"}
          </h1>
          <p className="text-center text-muted-foreground">
            {mode === "threadpool"
              ? "Modelo clásico para tareas I/O-Bound"
              : "Divide y Conquista para tareas CPU-Bound"}
          </p>

          {/* Toggle Switch */}
          <div className="flex items-center justify-center gap-4 mt-6">
            <span
              className={`font-mono font-bold transition-colors ${
                mode === "threadpool" ? "text-orange-500" : "text-muted-foreground"
              }`}
            >
              ThreadPoolTaskExecutor
            </span>
            <button
              onClick={handleToggle}
              className={`relative inline-flex h-9 w-64 items-center rounded-full transition-colors ${
                mode === "threadpool" ? "bg-orange-500" : "bg-green-500"
              }`}
            >
              <span
                className={`inline-block h-7 w-32 transform rounded-full bg-background transition-transform ${
                  mode === "forkjoin" ? "translate-x-[120px]" : "translate-x-1"
                }`}
              />
              <span className="absolute left-4 font-mono text-sm font-bold text-background">
                ThreadPool
              </span>
              <span className="absolute right-4 font-mono text-sm font-bold text-background">
                ForkJoinPool
              </span>
            </button>
            <span
              className={`font-mono font-bold transition-colors ${
                mode === "forkjoin" ? "text-green-500" : "text-muted-foreground"
              }`}
            >
              ForkJoinPool
            </span>
          </div>
        </div>
      </header>

      <main className="w-full px-6 py-8 flex justify-center">
        <div className="max-w-7xl w-full mx-auto">
        {/* ThreadPool Content */}
        {mode === "threadpool" && (
          <div>
            <Card className="p-8 mb-8">
              <h2 className="text-2xl font-bold text-orange-500 border-b-2 border-orange-500 pb-2 mb-4 font-mono">
                ¿Qué es el <code className="text-green-400">ThreadPoolTaskExecutor</code>?
              </h2>
              <p className="mb-4">
                El <code className="bg-card px-2 py-1 rounded text-green-400">ThreadPoolTaskExecutor</code> (o su análogo <code className="bg-card px-2 py-1 rounded text-green-400">FixedThreadPool</code>) utiliza un conjunto de hilos de tamaño fijo que trabajan con una <strong>cola de tareas compartida (Shared Queue)</strong>. Es la solución recomendada para cargas de trabajo que incluyen operaciones de <strong>E/S bloqueantes (I/O-Bound)</strong>.
              </p>
              <ul className="list-disc ml-6 space-y-2">
                <li>
                  <strong>Mecanismo FIFO:</strong> Las tareas se procesan en el orden en que llegan a la cola (<strong>First-In, First-Out</strong>).
                </li>
                <li>
                  <strong>Resiliencia I/O:</strong> El pool tiene más hilos que núcleos de CPU, asumiendo que algunos se bloquearán en I/O.
                </li>
              </ul>
            </Card>

            {/* Animation Section */}
            <Card className="p-8">
              <h2 className="text-2xl font-bold text-orange-500 border-b-2 border-orange-500 pb-2 mb-6 font-mono">
                Animación Interactiva: Resiliencia I/O (FIFO)
              </h2>
              <p className="mb-6">
                Observa cómo el bloqueo de un Worker no paraliza el pool. Hemos aumentado los tiempos para que puedas seguir el flujo de cada tarea.
              </p>

              {/* Shared Queue */}
              <div className="bg-card/50 border-2 border-orange-500 rounded-lg p-4 mb-6">
                <h4 className="text-orange-500 font-mono font-bold text-center mb-3">
                  🔗 Cola de Tareas Compartida (FIFO)
                </h4>
                <div className="relative">
                  <span className="absolute -top-3 left-4 bg-card px-2 text-xs text-muted-foreground font-bold">
                    FIFO (Oldest) → Cola → LIFO (Newest)
                  </span>
                  <div className="min-h-20 bg-background border-2 border-dashed border-border rounded p-3 flex items-center overflow-x-auto">
                    <div className="flex gap-2">
                      {sharedQueue.map((task) => (
                        <div
                          key={task.id}
                          className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center text-white text-xs font-bold font-mono shadow-lg flex-shrink-0 ${
                            task.type === "cpu"
                              ? "bg-gradient-to-br from-blue-500 to-blue-700"
                              : "bg-gradient-to-br from-purple-500 to-purple-700"
                          }`}
                        >
                          <span>{task.id}</span>
                          <span className="text-[10px]">{task.type.toUpperCase()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="text-center mb-6 p-4 bg-card/30 rounded-lg">
                <div className="flex gap-3 justify-center mb-3">
                  <Button
                    onClick={startThreadPoolAnimation}
                    disabled={isRunning}
                    className="bg-orange-500 hover:bg-orange-600 text-background font-mono"
                  >
                    ▶ Iniciar Animación
                  </Button>
                  <Button
                    onClick={resetThreadPool}
                    variant="outline"
                    className="border-orange-500 text-orange-500 hover:bg-orange-500/10 font-mono"
                  >
                    ↻ Reiniciar
                  </Button>
                </div>
                <div className="bg-[#3d342a] border-l-4 border-orange-500 p-3 text-left text-[#ffd99e] font-mono min-h-12">
                  {statusText || "Presiona \"Iniciar Animación\" para comenzar (Pool de 3 Workers)"}
                </div>
              </div>

              {/* Workers */}
              <div className="flex gap-5 justify-around">
                {workers.map((worker) => (
                  <div
                    key={worker.id}
                    className={`bg-card/50 rounded-lg p-4 border transition-all w-[30%] text-center ${
                      worker.status === "blocked"
                        ? "shadow-[0_0_20px_rgba(231,76,60,0.6)] bg-red-950/20 border-red-500"
                        : worker.status === "idle"
                        ? "opacity-70 border-border"
                        : "border-border"
                    }`}
                  >
                    <div className="font-bold text-lg mb-2 font-mono">🔧 Worker {worker.id}</div>
                    <div
                      className={`inline-block px-3 py-1 rounded-full text-sm font-bold font-mono ${
                        worker.status === "working"
                          ? "bg-green-950/50 text-green-400"
                          : worker.status === "blocked"
                          ? "bg-red-950/50 text-red-400 animate-pulse"
                          : "bg-blue-950/50 text-blue-400"
                      }`}
                    >
                      {worker.status === "working"
                        ? "Trabajando"
                        : worker.status === "blocked"
                        ? "Bloqueado"
                        : "Ocioso"}
                    </div>
                    <div className="min-h-16 mt-4 flex justify-center items-center">
                      {worker.currentTask && (
                        <div
                          className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center text-white text-xs font-bold font-mono shadow-lg ${
                            worker.currentTask.state === "blocked"
                              ? "bg-gradient-to-br from-red-500 to-red-700 animate-pulse"
                              : worker.currentTask.type === "cpu"
                              ? "bg-gradient-to-br from-green-500 to-green-700 animate-pulse"
                              : "bg-gradient-to-br from-purple-500 to-purple-700"
                          }`}
                        >
                          <span>{worker.currentTask.id}</span>
                          <span className="text-[10px]">
                            {worker.currentTask.type.toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex gap-6 justify-center mt-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-blue-700" />
                  <span className="text-sm">Tarea CPU (rápida)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-gradient-to-br from-purple-500 to-purple-700" />
                  <span className="text-sm">Tarea I/O (lenta/bloqueante)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-gradient-to-br from-green-500 to-green-700" />
                  <span className="text-sm">Worker Procesando</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-gradient-to-br from-red-500 to-red-700" />
                  <span className="text-sm">Worker Bloqueado</span>
                </div>
              </div>
            </Card>

            {/* Best Practice */}
            <Card className="p-6 mt-8 bg-green-950/20 border-green-500">
              <h3 className="text-xl font-bold text-green-500 border-b border-green-500 pb-2 mb-3">
                ¿Por Qué es Mejor para I/O?
              </h3>
              <p className="text-green-200">
                Al tener una <strong>cola única y compartida</strong>, cuando el Worker 1 toma una tarea de I/O y se bloquea, el Worker 2 y el Worker 3 no necesitan robar trabajo. Simplemente acuden a la misma cola compartida, toman la <strong>siguiente tarea FIFO</strong> y continúan trabajando, garantizando un alto throughput (rendimiento).
              </p>
            </Card>
          </div>
        )}

        {/* ForkJoinPool Content */}
        {mode === "forkjoin" && (
          <div>
            <Card className="p-8 mb-8">
              <h2 className="text-2xl font-bold text-green-500 border-b-2 border-green-500 pb-2 mb-4 font-mono">
                ¿Qué es el <code className="text-green-400">ForkJoinPool</code>?
              </h2>
              <p className="mb-4">
                El <code className="bg-card px-2 py-1 rounded text-green-400">ForkJoinPool</code> es un <code className="bg-card px-2 py-1 rounded text-green-400">ExecutorService</code> especializado en la ejecución eficiente de tareas que siguen el patrón <strong>"Divide y Conquista"</strong>. Es el motor detrás de la paralelización en los Streams de Java 8. Su principal característica es el uso de un número fijo de threads (hilos) trabajadores, generalmente igual al número de núcleos de CPU disponibles.
              </p>
              <ul className="list-disc ml-6 space-y-2">
                <li>
                  <strong>Fork (Ramificar):</strong> Una tarea se divide en subtareas más pequeñas.
                </li>
                <li>
                  <strong>Join (Unir):</strong> Se espera el resultado de las subtareas para combinarlas.
                </li>
              </ul>
            </Card>

            {/* Animation Section */}
            <Card className="p-8">
              <h2 className="text-2xl font-bold text-green-500 border-b-2 border-green-500 pb-2 mb-6 font-mono">
                Animación Interactiva: Work Stealing (LIFO vs. FIFO)
              </h2>
              <p className="mb-6">
                La <strong>cola local</strong> de un Worker se comporta como una <strong>PILA (LIFO)</strong>. El Worker roba de otra cola comportándose como una <strong>COLA (FIFO)</strong>, tomando el trabajo más antiguo.
              </p>

              {/* Task Producer */}
              <div className="bg-green-500/5 border-2 border-dashed border-green-500 rounded-lg p-4 mb-6 text-center">
                <h4 className="text-green-500 font-mono font-bold mb-1">
                  📥 Productor de Tareas (<code>ForkJoinPool.submit()</code>)
                </h4>
                <p className="text-sm text-muted-foreground">
                  Las tareas nuevas se distribuyen a los workers disponibles
                </p>
              </div>

              {/* Controls */}
              <div className="text-center mb-6 p-4 bg-card/30 rounded-lg">
                <div className="flex gap-3 justify-center mb-3">
                  <Button
                    onClick={startForkJoinAnimation}
                    disabled={isRunning}
                    className="bg-green-500 hover:bg-green-600 text-background font-mono"
                  >
                    ▶ Iniciar Animación
                  </Button>
                  <Button
                    onClick={resetForkJoinPool}
                    variant="outline"
                    className="border-green-500 text-green-500 hover:bg-green-500/10 font-mono"
                  >
                    ↻ Reiniciar
                  </Button>
                </div>
                <div className="bg-[#2a333d] border-l-4 border-blue-500 p-3 text-left text-[#a6c5e0] font-mono min-h-12">
                  {statusText || "Presiona \"Iniciar Animación\" para comenzar"}
                </div>
              </div>

              {/* Workers */}
              <div className="flex flex-col gap-5">
                {fjpWorkers.map((worker) => (
                  <div
                    key={worker.id}
                    className={`bg-card/50 rounded-lg p-4 border transition-all ${
                      worker.status === "stealing"
                        ? "shadow-[0_0_20px_rgba(46,204,113,0.6)] border-green-500 scale-[1.02]"
                        : worker.status === "idle"
                        ? "opacity-70 border-border"
                        : "border-border"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-border">
                      <span className="font-bold text-lg font-mono">
                        🔧 Worker {String.fromCharCode(64 + worker.id)}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-bold font-mono ${
                          worker.status === "working"
                            ? "bg-green-950/50 text-green-400"
                            : worker.status === "stealing"
                            ? "bg-blue-950/50 text-blue-400 animate-pulse"
                            : "bg-blue-950/50 text-blue-400"
                        }`}
                      >
                        {worker.status === "working"
                          ? "Trabajando"
                          : worker.status === "stealing"
                          ? "Robando"
                          : "Ocioso"}
                      </span>
                    </div>

                    {/* Worker Queue */}
                    <div className="relative">
                      <span className="absolute -top-3 left-4 bg-card px-2 text-xs text-muted-foreground font-bold z-10">
                        LIFO (Newest) ← Cola → FIFO (Oldest)
                      </span>
                      <div className="min-h-20 bg-background border-2 border-dashed border-border rounded p-3 flex items-center overflow-x-auto">
                        <div className="flex gap-2 flex-row-reverse w-full">
                          {worker.queue?.map((task) => (
                            <div
                              key={task.id}
                              className="w-12 h-12 rounded-lg flex flex-col items-center justify-center text-white text-xs font-bold font-mono shadow-lg flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-700"
                            >
                              <span>{task.id}</span>
                              <span className="text-[10px]">CPU</span>
                            </div>
                          ))}
                          {worker.currentTask && (
                            <div className="w-12 h-12 rounded-lg flex flex-col items-center justify-center text-white text-xs font-bold font-mono shadow-lg flex-shrink-0 bg-gradient-to-br from-green-500 to-green-700 animate-pulse scale-110">
                              <span>{worker.currentTask.id}</span>
                              <span className="text-[10px]">CPU</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex gap-6 justify-center mt-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-blue-700" />
                  <span className="text-sm">Tarea CPU</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-gradient-to-br from-green-500 to-green-700" />
                  <span className="text-sm">Tarea Robada (FIFO)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-gradient-to-br from-green-500 to-green-700 animate-pulse" />
                  <span className="text-sm">Procesando (LIFO Local)</span>
                </div>
              </div>

              {/* Sequence */}
              <div className="mt-8 p-6 bg-card/30 rounded-lg">
                <h3 className="text-lg font-bold mb-3">Secuencia de la Animación:</h3>
                <ol className="list-decimal ml-6 space-y-2">
                  <li>
                    <strong>Inicialización:</strong> Entran 10 tareas (4, 4, 2). Worker C tiene menos carga.
                  </li>
                  <li>
                    <strong>Proceso LIFO:</strong> Workers A y B procesan las tareas más a la derecha (las más nuevas).
                  </li>
                  <li>
                    <strong>Worker C Ocioso:</strong> Worker C termina sus 2 tareas y queda libre.
                  </li>
                  <li>
                    <strong>Robo FIFO:</strong> Worker C (ocioso) roba la tarea más a la izquierda de Worker A (la más antigua), demostrando el balanceo de carga.
                  </li>
                  <li>
                    <strong>Continuidad:</strong> El trabajo se balancea hasta que todas las colas están vacías.
                  </li>
                </ol>
              </div>
            </Card>

            {/* Blocking I/O Demonstration Section */}
            <Card className="p-8 mt-8">
              <h2 className="text-2xl font-bold text-red-500 border-b-2 border-red-500 pb-2 mb-6 font-mono">
                🔴 Riesgos Críticos: Blocking I/O y el ForkJoinPool
              </h2>
              <p className="mb-4">
                El uso del <code className="bg-card px-2 py-1 rounded text-green-400">ForkJoinPool</code> para tareas que realizan operaciones de <strong>E/S bloqueantes (Blocking I/O)</strong>, como acceder a bases de datos, leer archivos o hacer llamadas de red síncronas, es un <strong>antipatrón</strong> y un error de diseño grave.
              </p>

              <div className="bg-card/50 border-2 border-red-500 rounded-lg p-6 mb-6">
                <h3 className="text-center text-red-500 font-bold text-xl mb-6">
                  ⚠️ Demostración: Mezclando Tareas CPU con Tareas I/O Bloqueantes
                </h3>

                {/* Controls */}
                <div className="text-center mb-6 p-4 bg-card/30 rounded-lg">
                  <div className="flex gap-3 justify-center mb-3">
                    <Button
                      onClick={startBlockingAnimation}
                      disabled={isRunning}
                      className="bg-red-500 hover:bg-red-600 text-background font-mono"
                    >
                      ▶ Ver Antipatrón en Acción
                    </Button>
                    <Button
                      onClick={resetBlockingAnimation}
                      variant="outline"
                      className="border-green-500 text-green-500 hover:bg-green-500/10 font-mono"
                    >
                      ↻ Reiniciar
                    </Button>
                  </div>
                  <div className="bg-[#2a333d] border-l-4 border-blue-500 p-3 text-left text-[#a6c5e0] font-mono min-h-12">
                    {blockingStatusText || "Presiona para ver qué ocurre cuando se bloquea el pool (Se asume un Pool de 3 Workers)"}
                  </div>
                </div>

                {/* Blocking Workers */}
                <div className="flex flex-col gap-5">
                  {blockingWorkers.map((worker) => (
                    <div
                      key={worker.id}
                      className={`bg-card/50 rounded-lg p-4 border transition-all ${
                        worker.status === "blocked"
                          ? "shadow-[0_0_20px_rgba(231,76,60,0.6)] bg-red-950/20 border-red-500"
                          : "border-border"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-3 pb-2 border-b border-border">
                        <span className="font-bold text-lg font-mono">
                          🔧 Worker {String.fromCharCode(64 + worker.id)}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-bold font-mono ${
                            worker.status === "working"
                              ? "bg-green-950/50 text-green-400"
                              : worker.status === "blocked"
                              ? "bg-red-950/50 text-red-400 animate-pulse"
                              : "bg-blue-950/50 text-blue-400"
                          }`}
                        >
                          {worker.status === "working"
                            ? "Trabajando"
                            : worker.status === "blocked"
                            ? "Bloqueado"
                            : "Ocioso"}
                        </span>
                      </div>

                      {/* Worker Queue */}
                      <div className="relative">
                        <span className="absolute -top-3 left-4 bg-card px-2 text-xs text-muted-foreground font-bold z-10">
                          LIFO (Newest) ← Cola → FIFO (Oldest)
                        </span>
                        <div className="min-h-20 bg-background border-2 border-dashed border-border rounded p-3 flex items-center overflow-x-auto">
                          <div className="flex gap-2 flex-row-reverse w-full">
                            {worker.queue.map((task) => (
                              <div
                                key={task.id}
                                className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center text-white text-xs font-bold font-mono shadow-lg flex-shrink-0 ${
                                  task.state === "blocked"
                                    ? "bg-gradient-to-br from-red-500 to-red-700 animate-pulse"
                                    : task.type === "cpu"
                                    ? "bg-gradient-to-br from-blue-500 to-blue-700"
                                    : "bg-gradient-to-br from-purple-500 to-purple-700"
                                }`}
                              >
                                <span>{task.id.split('_')[0]}</span>
                                <span className="text-[10px]">{task.type.toUpperCase()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Deadlock Warning */}
                {showDeadlockWarning && (
                  <div className="bg-amber-950/50 border-l-4 border-red-500 p-4 mt-6 rounded font-bold text-amber-200 text-center text-lg animate-pulse">
                    ⛔ DEADLOCK: Todos los workers bloqueados por tareas I/O. Pool paralizado. ¡Hay 12 tareas CPU esperando!
                  </div>
                )}

                {/* Legend */}
                <div className="flex gap-6 justify-center mt-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-blue-700" />
                    <span className="text-sm">Tarea CPU (rápida)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-gradient-to-br from-purple-500 to-purple-700" />
                    <span className="text-sm">Tarea I/O (lenta/bloqueante)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-gradient-to-br from-red-500 to-red-700" />
                    <span className="text-sm">Worker Bloqueado</span>
                  </div>
                </div>
              </div>

              {/* Risk Box */}
              <Card className="p-6 bg-red-950/20 border-red-500">
                <h3 className="text-xl font-bold text-red-500 border-b border-red-500 pb-2 mb-3">
                  ¿Por Qué es un Antipatrón?
                </h3>
                <p className="text-red-200 mb-4">
                  El problema reside en que el <code className="bg-card px-2 py-1 rounded">ForkJoinPool</code> está diseñado como un threadpool de <strong>tamaño fijo y limitado</strong> (igual al número de núcleos de CPU), y asume que las tareas son <strong>CPU-bound</strong> (limitadas por la velocidad de la CPU).
                </p>
                <ol className="list-decimal ml-6 space-y-3 text-red-200">
                  <li>
                    <strong>Falta de Compensación:</strong> Cuando una tarea de I/O bloqueante (ej. una llamada a una API externa) se ejecuta, el thread trabajador del Pool se detiene por completo y espera el resultado. A diferencia de otros Pools, el <code className="bg-card px-1 rounded">ForkJoinPool</code> <strong>no compensa</strong> automáticamente creando un nuevo thread de reemplazo.
                  </li>
                  <li>
                    <strong>Deadlock (Interbloqueo) Potencial:</strong> Si todas las threads del pool se bloquean simultáneamente esperando respuestas de I/O, el pool queda completamente paralizado.
                  </li>
                </ol>
                <p className="text-red-200 mt-4">
                  <strong>En resumen:</strong> Estás usando un recurso escaso (los threads optimizados para CPU) y le estás ordenando sentarse a esperar a un recurso lento (I/O), lo que paraliza a todos los demás.
                </p>
              </Card>
            </Card>
          </div>
        )}
        </div>
      </main>
    </div>
  );
};

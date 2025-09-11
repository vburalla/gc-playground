import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BytecodeInstruction {
  pc: number;
  class: 'main' | 'calculator';
  instruction: string;
  line: number;
  jumpToClass?: 'main' | 'calculator';
}

export const PCRegisterSimulator = () => {
  const [currentInstructionIndex, setCurrentInstructionIndex] = useState(0);
  const [mainCardFlipped, setMainCardFlipped] = useState(false);
  const [calculatorCardFlipped, setCalculatorCardFlipped] = useState(false);
  const [pcValue, setPcValue] = useState('0');
  const [currentInstruction, setCurrentInstruction] = useState('Execution has not started yet.');
  const [highlightedClass, setHighlightedClass] = useState<'main' | 'calculator' | null>(null);
  const [highlightedPc, setHighlightedPc] = useState<number | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  const mainJavaCode = `class Main {
  public static void main(String[] args) {
    int result = Calculator.add(5, 3);
    System.out.println("The result is: " + result);
  }
}`;

  const mainBytecode = `0: iconst_5
1: iconst_3
2: invokestatic #7          // Method Calculator.add:(II)I
5: istore_1
6: getstatic #13            // Field java/lang/System.out:Ljava/io/PrintStream;
9: new #14                  // class java/lang/StringBuilder
12: dup
13: invokespecial #16        // Method java/lang/StringBuilder."<init>":()V
16: ldc #17                  // String The result is: 
18: invokevirtual #18        // Method java/lang/StringBuilder.append:(Ljava/lang/String;)Ljava/lang/StringBuilder;
21: iload_1
22: invokevirtual #19        // Method java/lang/StringBuilder.append:(I)Ljava/lang/StringBuilder;
25: invokevirtual #20        // Method java/lang/StringBuilder.toString:()Ljava/lang/String;
28: invokevirtual #24        // Method java/io/PrintStream.println:(Ljava/lang/String;)V
31: return`;

  const calculatorJavaCode = `class Calculator {
  public static int add(int a, int b) {
    int sum = a + b;
    return sum;
  }
}`;

  const calculatorBytecode = `0: iload_0
1: iload_1
2: iadd
3: istore_2
4: iload_2
5: ireturn`;

  const bytecodeInstructions: BytecodeInstruction[] = [
    // Main.class
    { pc: 0, class: 'main', instruction: 'iconst_5', line: 2 },
    { pc: 1, class: 'main', instruction: 'iconst_3', line: 2 },
    { pc: 2, class: 'main', instruction: 'invokestatic #7', line: 2, jumpToClass: 'calculator' },
    
    // Calculator.class
    { pc: 0, class: 'calculator', instruction: 'iload_0', line: 2 },
    { pc: 1, class: 'calculator', instruction: 'iload_1', line: 2 },
    { pc: 2, class: 'calculator', instruction: 'iadd', line: 2 },
    { pc: 3, class: 'calculator', instruction: 'istore_2', line: 3 },
    { pc: 4, class: 'calculator', instruction: 'iload_2', line: 4 },
    { pc: 5, class: 'calculator', instruction: 'ireturn', line: 5, jumpToClass: 'main' },
    
    // Back to Main.class
    { pc: 5, class: 'main', instruction: 'istore_1', line: 2 },
    { pc: 6, class: 'main', instruction: 'getstatic #13', line: 3 },
    { pc: 9, class: 'main', instruction: 'new #14', line: 3 },
    { pc: 12, class: 'main', instruction: 'dup', line: 3 },
    { pc: 13, class: 'main', instruction: 'invokespecial #16', line: 3 },
    { pc: 16, class: 'main', instruction: 'ldc #17', line: 3 },
    { pc: 18, class: 'main', instruction: 'invokevirtual #18', line: 3 },
    { pc: 21, class: 'main', instruction: 'iload_1', line: 3 },
    { pc: 22, class: 'main', instruction: 'invokevirtual #19', line: 3 },
    { pc: 25, class: 'main', instruction: 'invokevirtual #20', line: 3 },
    { pc: 28, class: 'main', instruction: 'invokevirtual #24', line: 3 },
    { pc: 31, class: 'main', instruction: 'return', line: 4 }
  ];

  const resetSimulation = () => {
    setCurrentInstructionIndex(0);
    setPcValue('0');
    setCurrentInstruction('Execution has not started yet.');
    setMainCardFlipped(false);
    setCalculatorCardFlipped(false);
    setHighlightedClass(null);
    setHighlightedPc(null);
    setIsFinished(false);
  };

  const nextStep = () => {
    if (isFinished) {
      resetSimulation();
      return;
    }

    if (currentInstructionIndex < bytecodeInstructions.length) {
      const instructionData = bytecodeInstructions[currentInstructionIndex];
      
      // Update PC value
      setPcValue(`${instructionData.pc} (${instructionData.class}.class)`);
      
      // Update current instruction text
      setCurrentInstruction(`${instructionData.pc}: ${instructionData.instruction}`);

      // Highlight the code line
      setHighlightedClass(instructionData.class);
      setHighlightedPc(instructionData.pc);

      // If there's a class jump, flip the cards
      if (instructionData.jumpToClass) {
        if (instructionData.jumpToClass === 'calculator') {
          setCalculatorCardFlipped(true);
          setMainCardFlipped(false);
        } else {
          setMainCardFlipped(true);
          setCalculatorCardFlipped(false);
        }
      }

      // Increment index for the next step
      setCurrentInstructionIndex(prev => prev + 1);
    } else {
      // End of simulation
      setPcValue('END');
      setCurrentInstruction('Execution has finished.');
      setIsFinished(true);
      setHighlightedClass(null);
      setHighlightedPc(null);
    }
  };

  const formatCode = (code: string, className: 'main' | 'calculator', isBytecode: boolean = false) => {
    return code.split('\n').map((line, index) => {
      let isHighlighted = false;
      if (isBytecode && highlightedClass === className) {
        const pc = parseInt(line.trim().split(':')[0]);
        isHighlighted = pc === highlightedPc;
      }
      
      return (
        <div 
          key={index}
          className={`font-mono text-sm leading-relaxed ${
            isHighlighted ? 'bg-warning/20 border-l-4 border-warning pl-2 -ml-2 font-bold' : ''
          }`}
        >
          <span className="text-foreground">{line || '\u00A0'}</span>
        </div>
      );
    });
  };

  const FlipCard = ({ 
    title, 
    javaCode, 
    bytecode, 
    className, 
    isFlipped, 
    onFlip 
  }: { 
    title: string;
    javaCode: string;
    bytecode: string;
    className: 'main' | 'calculator';
    isFlipped: boolean;
    onFlip: () => void;
  }) => (
    <div className="w-full h-[700px] relative overflow-hidden" style={{ perspective: '1200px' }}>
      <div
        className="w-full h-full relative transition-transform duration-700"
        style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'none' }}
      >
        {/* Front side - Java Code */}
        <Card
          className="absolute inset-0 flex flex-col h-full"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(0deg)' }}
        >
          <CardHeader>
            <CardTitle className="text-primary">Class: {title}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto pb-16">
            <pre className="bg-muted/30 p-4 rounded-lg h-full overflow-auto font-mono text-sm">
              <code>{javaCode}</code>
            </pre>
          </CardContent>
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <Button onClick={onFlip} variant="outline" size="sm" className="bg-muted hover:bg-muted/80">
              View Bytecode
            </Button>
          </div>
        </Card>
        
        {/* Back side - Bytecode */}
        <Card
          className="absolute inset-0 flex flex-col h-full"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <CardHeader>
            <CardTitle className="text-primary">Bytecode: {title.replace('.java', '.class')}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto pb-16">
            <pre className="bg-muted/30 p-4 rounded-lg h-full overflow-auto font-mono text-sm">
              <code>
                {formatCode(bytecode, className, true)}
              </code>
            </pre>
          </CardContent>
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
            <Button onClick={onFlip} variant="outline" size="sm" className="bg-muted hover:bg-muted/80">
              View Java Code
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-bg">
      <main className="w-full p-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Java PC Register Simulator</h1>
          <p className="text-muted-foreground">Observe the step-by-step execution through two Java classes</p>
        </div>

        <div className="w-full grid grid-cols-1 lg:grid-cols-3 items-start gap-10">
          {/* Left: two code cards */}
          <div className="min-w-0 lg:col-span-2 grid gap-5 grid-cols-1 lg:grid-cols-2">
            <div className="min-w-0">
              <FlipCard
                title="Main.java"
                javaCode={mainJavaCode}
                bytecode={mainBytecode}
                className="main"
                isFlipped={mainCardFlipped}
                onFlip={() => setMainCardFlipped(!mainCardFlipped)}
              />
            </div>

            <div className="min-w-0">
              <FlipCard
                title="Calculator.java"
                javaCode={calculatorJavaCode}
                bytecode={calculatorBytecode}
                className="calculator"
                isFlipped={calculatorCardFlipped}
                onFlip={() => setCalculatorCardFlipped(!calculatorCardFlipped)}
              />
            </div>
          </div>

          {/* Right: PC Register panel */}
          <div className="w-full lg:col-span-1">
            <Card className="h-[700px] flex flex-col">
              <CardHeader>
                <CardTitle className="text-primary text-center">PC Register Simulation</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col items-center justify-center space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-success mb-4">
                    PC: {pcValue}
                  </div>
                  <div className="min-h-[80px] bg-muted/30 p-4 rounded-lg flex items-center justify-center text-center">
                    <p className="text-foreground">{currentInstruction}</p>
                  </div>
                </div>
                <Button 
                  onClick={nextStep}
                  size="lg"
                  className="mt-6"
                >
                  {isFinished ? '🔄 Restart Process' : '▶ Next Step'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};